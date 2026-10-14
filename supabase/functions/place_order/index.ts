// Supabase Edge Function: place_order
//
// Validates stock, creates one `orders` row per vendor represented in the
// caller's cart (sharing a `checkout_group`), snapshots line items into
// `order_items`, decrements stock, and clears the cart. Runs with the
// service-role key so it can write to `orders`/`order_items` even though
// those tables intentionally have no client-facing insert policy — this
// function is the only place order rows get created.
//
// Deploy with: pnpm dlx supabase functions deploy place_order

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The admin-configured, city-wise default (Settings > Default delivery fee),
// used only when the vendor hasn't set their own rate for the city. No row
// for the city (and no "Other" row) means the admin hasn't set a default —
// free, rather than guessing a number nobody configured. Applied per vendor
// order, since checkout splits into one order per vendor.
function deliveryFeeFor(subtotal: number, defaultFee: number | null, freeThreshold: number | null): number {
  if (freeThreshold !== null && subtotal >= freeThreshold) return 0;
  return defaultFee ?? 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  let body: { address_id?: string; payment_method?: string; coupon_code?: string; redeem_points?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.address_id || !body.payment_method) {
    return json({ error: "address_id and payment_method are required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Confirm the address belongs to this customer.
  const { data: address } = await admin
    .from("addresses")
    .select("id, customer_id, full_name, phone, address_line, area, city")
    .eq("id", body.address_id)
    .maybeSingle();
  if (!address || address.customer_id !== user.id) {
    return json({ error: "Address not found" }, 404);
  }

  // Per-vendor delivery rate overrides for the delivery city: a vendor's exact
  // -city rate if they set one, else their "Other cities" rate if they set
  // that instead. Falls back to deliveryFeeFor() below when neither is set.
  const { data: deliveryRates } = await admin
    .from("vendor_delivery_rates")
    .select("vendor_id, city, fee")
    .or(`city.ilike.${address.city},city.ilike.Other`);
  const deliveryRateFallback = new Map<string, number>();
  const deliveryRateExact = new Map<string, number>();
  for (const r of deliveryRates ?? []) {
    if (r.city.toLowerCase() === address.city.toLowerCase()) deliveryRateExact.set(r.vendor_id, r.fee);
    else deliveryRateFallback.set(r.vendor_id, r.fee);
  }
  const deliveryRateByVendor = new Map([...deliveryRateFallback, ...deliveryRateExact]);

  // Admin's city-wise fallback: this city's row if set, else the "Other" row.
  const { data: defaultRateRows } = await admin
    .from("default_delivery_rates")
    .select("city, fee, free_delivery_threshold")
    .or(`city.ilike.${address.city},city.ilike.Other`);
  const platformDefault =
    (defaultRateRows ?? []).find((r) => r.city.toLowerCase() === address.city.toLowerCase()) ??
    (defaultRateRows ?? []).find((r) => r.city.toLowerCase() === "other") ??
    null;

  const { data: cartItems, error: cartError } = await admin
    .from("cart_items")
    .select(
      "id, quantity, product_id, variant_id, products(id, name, price, stock_quantity, vendor_id, category_id, status), product_variants(id, option_name, option_value, price_override, stock_quantity)",
    )
    .eq("customer_id", user.id);

  if (cartError) return json({ error: cartError.message }, 500);
  if (!cartItems || cartItems.length === 0) {
    return json({ error: "Cart is empty" }, 400);
  }

  // Validate stock and availability before writing anything.
  for (const item of cartItems) {
    const product = item.products as unknown as {
      id: string;
      name: string;
      price: number;
      stock_quantity: number | null;
      vendor_id: string;
      category_id: string | null;
      status: string;
    } | null;
    if (!product || product.status !== "published") {
      return json({ error: `A product in your cart is no longer available.` }, 409);
    }
    const variant = item.product_variants as unknown as {
      stock_quantity: number | null;
    } | null;
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    // null = the vendor doesn't track stock for this item, so it never runs out.
    if (availableStock !== null && item.quantity > availableStock) {
      return json(
        { error: `Not enough stock for "${product.name}" (only ${availableStock} left).` },
        409,
      );
    }
  }

  // Group by vendor.
  const byVendor = new Map<string, typeof cartItems>();
  for (const item of cartItems) {
    const product = item.products as unknown as { vendor_id: string };
    const list = byVendor.get(product.vendor_id) ?? [];
    list.push(item);
    byVendor.set(product.vendor_id, list);
  }

  const { data: settings } = await admin
    .from("platform_settings")
    .select(
      "default_commission_rate, commission_free_months, loyalty_enabled, loyalty_point_value, loyalty_min_redeem_points, loyalty_max_redeem_percent",
    )
    .single();
  const defaultCommissionRate = settings?.default_commission_rate ?? 0;
  const commissionFreeMonths = settings?.commission_free_months ?? 0;

  // A coupon is vendor-scoped: it only discounts the order for the vendor it
  // was created by, even if the cart spans multiple vendors.
  let coupon: {
    id: string;
    vendor_id: string;
    code: string;
    discount_type: string;
    amount: number;
  } | null = null;
  if (body.coupon_code) {
    const { data } = await admin
      .from("coupons")
      .select("id, vendor_id, code, discount_type, amount, status, expires_at")
      .eq("code", body.coupon_code.toUpperCase())
      .maybeSingle();
    if (
      data &&
      data.status === "active" &&
      (!data.expires_at || new Date(data.expires_at) >= new Date())
    ) {
      coupon = data;
    }
  }

  // Admin-managed promotions ("20% off Electronics" etc) apply automatically —
  // no code needed. Fetched once and matched per vendor group below.
  const nowIso = new Date().toISOString();
  const { data: activePromotionsRaw } = await admin
    .from("promotions")
    .select(
      "id, vendor_id, category_id, discount_type, discount_value, funded_by, vendor_funded_percent, max_discount_amount, min_order_amount, promotion_products(product_id), categories(subcategories:categories!parent_id(id))",
    )
    .eq("is_active", true)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso);
  const activePromotions = (activePromotionsRaw ?? []).map((p) => ({
    ...p,
    product_ids: (p.promotion_products as unknown as { product_id: string }[]).map(
      (pp) => pp.product_id,
    ),
    // A promo on a main category also covers its sub-categories.
    category_ids: p.category_id
      ? [
          p.category_id,
          ...((p.categories as unknown as { subcategories: { id: string }[] } | null)?.subcategories ?? []).map(
            (c) => c.id,
          ),
        ]
      : [],
  }));

  function promotionUnitDiscount(
    promo: { discount_type: string; discount_value: number },
    unitPrice: number,
  ): number {
    if (promo.discount_type === "percentage") return unitPrice * (promo.discount_value / 100);
    // 'fixed' → discount_value is the sale price, not an amount to subtract.
    return Math.max(0, unitPrice - promo.discount_value);
  }

  const checkoutGroup = crypto.randomUUID();
  const createdOrders: { id: string; order_number: string; vendor_id: string; total: number }[] =
    [];

  type Group = {
    vendorId: string;
    items: typeof cartItems;
    subtotal: number;
    deliveryFee: number;
    discountAmount: number;
    appliesHere: boolean;
    bestPromoId: string | null;
    promotionDiscountAmount: number;
    promotionKmoFundedAmount: number;
    promotionVendorFundedAmount: number;
    loyaltyPoints: number;
    loyaltyDiscount: number;
  };
  const groups: Group[] = [];

  for (const [vendorId, items] of byVendor) {
    const subtotal = items.reduce((sum, item) => {
      const product = item.products as unknown as { price: number };
      const variant = item.product_variants as unknown as {
        price_override: number | null;
      } | null;
      const unitPrice = variant?.price_override ?? product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
    const deliveryFee =
      deliveryRateByVendor.get(vendorId) ??
      deliveryFeeFor(subtotal, platformDefault?.fee ?? null, platformDefault?.free_delivery_threshold ?? null);

    // Pick the best-matching promotion for this vendor's items, if any. A
    // promo can be scoped to a vendor and/or a category — both null means
    // "sitewide". When several match, the one giving the bigger discount wins.
    let bestPromo: {
      id: string;
      vendor_id: string | null;
      category_id: string | null;
      discount_type: string;
      discount_value: number;
      funded_by: string;
      vendor_funded_percent: number;
      max_discount_amount: number | null;
      min_order_amount: number | null;
      product_ids: string[];
      category_ids: string[];
    } | null = null;
    let bestPromoDiscount = 0;
    for (const promo of activePromotions) {
      const productScoped = promo.product_ids.length > 0;
      if (!productScoped && promo.vendor_id && promo.vendor_id !== vendorId) continue;
      if (promo.min_order_amount && subtotal < promo.min_order_amount) continue;
      let raw = 0;
      for (const item of items) {
        const product = item.products as unknown as {
          id: string;
          price: number;
          category_id: string | null;
        };
        if (productScoped) {
          if (!promo.product_ids.includes(product.id)) continue;
        } else if (
          promo.category_id &&
          (!product.category_id || !promo.category_ids.includes(product.category_id))
        ) {
          continue;
        }
        const variant = item.product_variants as unknown as { price_override: number | null } | null;
        const unitPrice = variant?.price_override ?? product.price;
        raw += promotionUnitDiscount(promo, unitPrice) * item.quantity;
      }
      if (raw <= 0) continue;
      const capped = promo.max_discount_amount ? Math.min(raw, promo.max_discount_amount) : raw;
      if (capped > bestPromoDiscount) {
        bestPromoDiscount = capped;
        bestPromo = promo;
      }
    }
    const promotionDiscountAmount = Math.round(bestPromoDiscount * 100) / 100;
    const vendorFundedPercent = bestPromo?.vendor_funded_percent ?? 0;
    const promotionVendorFundedAmount =
      Math.round(promotionDiscountAmount * (vendorFundedPercent / 100) * 100) / 100;
    const promotionKmoFundedAmount =
      Math.round((promotionDiscountAmount - promotionVendorFundedAmount) * 100) / 100;

    // A promotion and a manually-entered coupon don't stack for the same
    // vendor — whichever the customer already qualifies for via the
    // promotion takes priority, so a coupon code can't silently double-discount.
    const appliesHere = coupon && coupon.vendor_id === vendorId && !bestPromo;
    const discountAmount = appliesHere
      ? Math.min(
          subtotal,
          coupon!.discount_type === "percentage"
            ? Math.round(subtotal * (coupon!.amount / 100) * 100) / 100
            : coupon!.amount,
        )
      : 0;
    groups.push({
      vendorId,
      items,
      subtotal,
      deliveryFee,
      discountAmount,
      appliesHere: !!appliesHere,
      bestPromoId: bestPromo?.id ?? null,
      promotionDiscountAmount,
      promotionKmoFundedAmount,
      promotionVendorFundedAmount,
      loyaltyPoints: 0,
      loyaltyDiscount: 0,
    });
  }

  // ---- Loyalty points (KMO-funded, so vendor payouts are untouched).
  const loyaltyOn = settings?.loyalty_enabled === true;
  const pointValue = Number(settings?.loyalty_point_value ?? 0);
  const eligibleOf = (g: Group) => Math.max(0, g.subtotal - g.discountAmount - g.promotionDiscountAmount);
  const eligibleTotal = groups.reduce((s, g) => s + eligibleOf(g), 0);
  let redeemPoints = Math.floor(Number(body.redeem_points ?? 0));
  if (redeemPoints > 0) {
    if (!loyaltyOn || pointValue <= 0) return json({ error: "Loyalty points can't be used right now." }, 400);
    if (redeemPoints < (settings?.loyalty_min_redeem_points ?? 0)) {
      return json({ error: `You need at least ${settings?.loyalty_min_redeem_points} points to use them.` }, 400);
    }
    // Never more than the allowed share of the order.
    const maxDiscount = eligibleTotal * (Number(settings?.loyalty_max_redeem_percent ?? 0) / 100);
    redeemPoints = Math.min(redeemPoints, Math.floor(maxDiscount / pointValue));
    if (redeemPoints > 0) {
      const { error: spendError } = await admin.rpc("loyalty_spend", {
        p_customer: user.id,
        p_points: redeemPoints,
        p_group: checkoutGroup,
      });
      if (spendError) return json({ error: "You don't have enough points." }, 409);
      // Split points across vendor orders by their share of the bill.
      let left = redeemPoints;
      groups.forEach((g, i) => {
        const share =
          i === groups.length - 1 ? left : Math.floor(redeemPoints * (eligibleTotal ? eligibleOf(g) / eligibleTotal : 0));
        g.loyaltyPoints = Math.min(share, left);
        g.loyaltyDiscount = Math.round(g.loyaltyPoints * pointValue * 100) / 100;
        left -= g.loyaltyPoints;
      });
    }
  }

  // Points to earn, from the rule live right now; credited when delivered.
  let earnRule: { id: string; spend_pkr: number; points: number } | null = null;
  if (loyaltyOn) {
    const { data: rule } = await admin.rpc("loyalty_active_rule");
    const r = rule as { id: string | null; spend_pkr: number; points: number } | null;
    if (r?.id) earnRule = { id: r.id, spend_pkr: Number(r.spend_pkr), points: Number(r.points) };
  }

  let pointsAttached = 0;
  // Vendor prices for products KMO lists on a vendor's behalf (super-admin
  // only data). The vendor is paid on the vendor price; the difference is KMO's.
  const cartProductIds = [...new Set(cartItems.map((i) => i.product_id as string))];
  const { data: costRows } = await admin
    .from("product_costs")
    .select("product_id, vendor_price")
    .in("product_id", cartProductIds);
  const vendorPriceOf = new Map((costRows ?? []).map((r) => [r.product_id as string, Number(r.vendor_price)]));

  for (const g of groups) {
    const {
      vendorId,
      items,
      subtotal,
      deliveryFee,
      discountAmount,
      appliesHere,
      promotionDiscountAmount,
      promotionKmoFundedAmount,
      promotionVendorFundedAmount,
    } = g;
    const total = subtotal + deliveryFee - discountAmount - promotionDiscountAmount - g.loyaltyDiscount;
    const pointsToEarn = earnRule
      ? Math.floor(((eligibleOf(g) - g.loyaltyDiscount) * earnRule.points) / earnRule.spend_pkr)
      : 0;
    const orderNumber = await generateOrderNumber(admin);

    const { data: vendorRow } = await admin
      .from("vendors")
      .select("commission_rate, membership_started_at, owner_id, store_name")
      .eq("id", vendorId)
      .maybeSingle();
    // No commission for the first months after the vendor's on-boarding date,
    // then their own rate if they have one, else the platform rate.
    const commissionStartsAt = new Date(vendorRow?.membership_started_at ?? 0);
    commissionStartsAt.setMonth(commissionStartsAt.getMonth() + commissionFreeMonths);
    const commissionRate =
      commissionStartsAt.getTime() > Date.now() ? 0 : (vendorRow?.commission_rate ?? defaultCommissionRate);
    // Commission is always on the pre-discount price — on every promotion
    // model. A vendor's commission never moves because of a promotion, only
    // their net payout does (via promotionVendorFundedAmount below).
    // What the vendor is owed for these items: their vendor price where KMO set
    // one, otherwise the selling price. Commission is on that amount.
    const vendorBase = items.reduce((sum, item) => {
      const product = item.products as unknown as { id: string; price: number };
      const variant = item.product_variants as unknown as { price_override: number | null } | null;
      const unit = vendorPriceOf.get(product.id) ?? variant?.price_override ?? product.price;
      return sum + unit * item.quantity;
    }, 0);
    const commissionAmount = Math.round(vendorBase * (commissionRate / 100) * 100) / 100;
    const netAmount = vendorBase - commissionAmount - promotionVendorFundedAmount;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        checkout_group: checkoutGroup,
        order_number: orderNumber,
        customer_id: user.id,
        vendor_id: vendorId,
        address_id: body.address_id,
        // Snapshot of where to deliver, readable by the vendor on their order.
        ship_name: address.full_name,
        ship_phone: address.phone,
        ship_address_line: address.address_line,
        ship_area: address.area,
        ship_city: address.city,
        payment_method: body.payment_method as never,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        coupon_code: appliesHere ? coupon!.code : null,
        discount_amount: discountAmount,
        promotion_id: g.bestPromoId,
        promotion_discount_amount: promotionDiscountAmount,
        promotion_kmo_funded_amount: promotionKmoFundedAmount,
        promotion_vendor_funded_amount: promotionVendorFundedAmount,
        loyalty_points_redeemed: g.loyaltyPoints,
        loyalty_discount_amount: g.loyaltyDiscount,
        loyalty_points_to_earn: Math.max(0, pointsToEarn),
        loyalty_rule_id: earnRule?.id ?? null,
      })
      .select("id, order_number, vendor_id, total")
      .single();
    if (orderError || !order) {
      // Give back points that didn't end up on an order.
      const unattached = redeemPoints - pointsAttached;
      if (unattached > 0) {
        await admin.from("loyalty_ledger").insert({
          customer_id: user.id,
          points: unattached,
          kind: "refund_redeem",
          checkout_group: checkoutGroup,
          note: "Checkout failed",
        });
      }
      return json({ error: orderError?.message ?? "Failed to create order" }, 500);
    }
    pointsAttached += g.loyaltyPoints;

    const orderItemsPayload = items.map((item) => {
      const product = item.products as unknown as { id: string; name: string; price: number };
      const variant = item.product_variants as unknown as {
        id: string;
        option_name: string;
        option_value: string;
        price_override: number | null;
      } | null;
      return {
        order_id: order.id,
        product_id: product.id,
        variant_id: variant?.id ?? null,
        product_name: product.name,
        variant_label: variant ? variantLabel(variant) : null,
        unit_price: variant?.price_override ?? product.price,
        quantity: item.quantity,
      };
    });
    const { data: insertedItems } = await admin
      .from("order_items")
      .insert(orderItemsPayload)
      .select("id, product_id, unit_price, quantity");
    const costLines = (insertedItems ?? [])
      .filter((it) => vendorPriceOf.has(it.product_id as string))
      .map((it) => {
        const vendorUnit = vendorPriceOf.get(it.product_id as string)!;
        return {
          order_item_id: it.id,
          order_id: order.id,
          vendor_unit_price: vendorUnit,
          unit_price: it.unit_price,
          quantity: it.quantity,
          margin_amount: Math.round((Number(it.unit_price) - vendorUnit) * Number(it.quantity) * 100) / 100,
        };
      });
    if (costLines.length) await admin.from("order_item_costs").insert(costLines);

    // Decrement stock (untracked stock, null, stays null).
    for (const item of items) {
      if (item.variant_id) {
        const variant = item.product_variants as unknown as { stock_quantity: number | null };
        if (variant.stock_quantity === null) continue;
        await admin
          .from("product_variants")
          .update({ stock_quantity: variant.stock_quantity - item.quantity })
          .eq("id", item.variant_id);
      } else {
        const product = item.products as unknown as { stock_quantity: number | null };
        if (product.stock_quantity === null) continue;
        await admin
          .from("products")
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq("id", item.product_id);
      }
    }

    if (vendorRow?.owner_id) {
      await admin.from("notifications").insert({
        recipient_id: vendorRow.owner_id,
        type: "new_order",
        title: `New order #${order.order_number}`,
        body: `Rs. ${total.toLocaleString()} · ${items.length} item${items.length === 1 ? "" : "s"}`,
        link: "/orders",
      });
    }

    createdOrders.push(order);
  }

  await admin.from("cart_items").delete().eq("customer_id", user.id);

  return json({ orders: createdOrders }, 200);
});

async function generateOrderNumber(
  admin: ReturnType<typeof createClient>,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `KMO-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data } = await admin
      .from("orders")
      .select("id")
      .eq("order_number", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `KMO-${crypto.randomUUID().slice(0, 8)}`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Same as @kmo/shared variantLabel: "Colour / Size" + "Ivory / M" -> "Colour: Ivory, Size: M".
function variantLabel(v: { option_name: string; option_value: string }): string {
  const names = v.option_name.split(" / ");
  const values = v.option_value.split(" / ");
  return names.map((n, i) => `${n.trim()}: ${(values[i] ?? "").trim()}`).join(", ");
}
