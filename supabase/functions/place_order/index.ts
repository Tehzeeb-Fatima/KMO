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

// Matches the PDP sidebar copy: "Free over Rs. 2,500, otherwise Rs. 120 flat."
// Applied per vendor order, since checkout splits into one order per vendor.
function deliveryFeeFor(subtotal: number): number {
  return subtotal >= 2500 ? 0 : 120;
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

  let body: { address_id?: string; payment_method?: string; coupon_code?: string };
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
    .select("id, customer_id")
    .eq("id", body.address_id)
    .maybeSingle();
  if (!address || address.customer_id !== user.id) {
    return json({ error: "Address not found" }, 404);
  }

  const { data: cartItems, error: cartError } = await admin
    .from("cart_items")
    .select(
      "id, quantity, product_id, variant_id, products(id, name, price, stock_quantity, vendor_id, status), product_variants(id, option_name, option_value, price_override, stock_quantity)",
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
      stock_quantity: number;
      vendor_id: string;
      status: string;
    } | null;
    if (!product || product.status !== "published") {
      return json({ error: `A product in your cart is no longer available.` }, 409);
    }
    const variant = item.product_variants as unknown as {
      stock_quantity: number;
    } | null;
    const availableStock = variant ? variant.stock_quantity : product.stock_quantity;
    if (item.quantity > availableStock) {
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
    .select("default_commission_rate")
    .single();
  const defaultCommissionRate = settings?.default_commission_rate ?? 8;

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

  const checkoutGroup = crypto.randomUUID();
  const createdOrders: { id: string; order_number: string; vendor_id: string; total: number }[] =
    [];

  for (const [vendorId, items] of byVendor) {
    const subtotal = items.reduce((sum, item) => {
      const product = item.products as unknown as { price: number };
      const variant = item.product_variants as unknown as {
        price_override: number | null;
      } | null;
      const unitPrice = variant?.price_override ?? product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
    const deliveryFee = deliveryFeeFor(subtotal);
    const appliesHere = coupon && coupon.vendor_id === vendorId;
    const discountAmount = appliesHere
      ? Math.min(
          subtotal,
          coupon!.discount_type === "percentage"
            ? Math.round(subtotal * (coupon!.amount / 100) * 100) / 100
            : coupon!.amount,
        )
      : 0;
    const total = subtotal + deliveryFee - discountAmount;
    const orderNumber = await generateOrderNumber(admin);

    const { data: vendorRow } = await admin
      .from("vendors")
      .select("commission_rate")
      .eq("id", vendorId)
      .maybeSingle();
    const commissionRate = vendorRow?.commission_rate ?? defaultCommissionRate;
    const commissionAmount = Math.round(subtotal * (commissionRate / 100) * 100) / 100;
    const netAmount = subtotal - commissionAmount;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        checkout_group: checkoutGroup,
        order_number: orderNumber,
        customer_id: user.id,
        vendor_id: vendorId,
        address_id: body.address_id,
        payment_method: body.payment_method as never,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        coupon_code: appliesHere ? coupon!.code : null,
        discount_amount: discountAmount,
      })
      .select("id, order_number, vendor_id, total")
      .single();
    if (orderError || !order) {
      return json({ error: orderError?.message ?? "Failed to create order" }, 500);
    }

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
        variant_label: variant ? `${variant.option_name}: ${variant.option_value}` : null,
        unit_price: variant?.price_override ?? product.price,
        quantity: item.quantity,
      };
    });
    await admin.from("order_items").insert(orderItemsPayload);

    // Decrement stock.
    for (const item of items) {
      if (item.variant_id) {
        const variant = item.product_variants as unknown as { stock_quantity: number };
        await admin
          .from("product_variants")
          .update({ stock_quantity: variant.stock_quantity - item.quantity })
          .eq("id", item.variant_id);
      } else {
        const product = item.products as unknown as { stock_quantity: number };
        await admin
          .from("products")
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq("id", item.product_id);
      }
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
