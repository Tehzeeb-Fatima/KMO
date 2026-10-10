/**
 * Hand-maintained until the schema stabilizes. Once migrations settle,
 * regenerate with:
 *   pnpm dlx supabase gen types typescript --project-id igjrtfgnlvepemdehbdn > packages/shared/src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "customer" | "vendor" | "admin" | "staff";
export type VendorVerificationStatus = "pending" | "approved" | "rejected" | "suspended";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

/**
 * Freeform per-day hours text (e.g. "11:00 AM – 9:00 PM", "Closed", or a
 * split shift "11:00 AM – 1:00 PM, 3:00 – 9:00 PM") — matches the exact
 * display format used in the vendor dashboard mockup's Store hours list.
 */
export type BusinessHours = Partial<Record<WeekDay, string>>;

export interface VendorPolicies {
  shipping?: string;
  refunds?: string;
}

export type ProductStatus = "draft" | "published" | "pending" | "archived";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_to_ship"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";
export type PaymentMethod = "cod" | "card" | "jazzcash" | "easypaisa";
export type PayoutStatus = "pending" | "paid";
export type ReturnStatus = "requested" | "approved" | "rejected" | "processing" | "resolved";
export type DiscountType = "percentage" | "fixed";
export type CouponStatus = "active" | "disabled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          pending_vendor: boolean;
          admin_modules: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          pending_vendor?: boolean;
          admin_modules?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          pending_vendor?: boolean;
          admin_modules?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          owner_id: string;
          store_name: string;
          slug: string;
          logo_url: string | null;
          cover_url: string | null;
          description: string | null;
          phone: string | null;
          address: string | null;
          area: string | null;
          verification_status: VendorVerificationStatus;
          is_on_vacation: boolean;
          vacation_message: string | null;
          policies: VendorPolicies;
          business_hours: BusinessHours;
          commission_rate: number | null;
          preferred_courier: string | null;
          preferred_courier_id: string | null;
          membership_started_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          store_name: string;
          slug: string;
          logo_url?: string | null;
          cover_url?: string | null;
          description?: string | null;
          phone?: string | null;
          address?: string | null;
          area?: string | null;
          verification_status?: VendorVerificationStatus;
          is_on_vacation?: boolean;
          vacation_message?: string | null;
          policies?: VendorPolicies;
          business_hours?: BusinessHours;
          commission_rate?: number | null;
          preferred_courier?: string | null;
          preferred_courier_id?: string | null;
          membership_started_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          store_name?: string;
          slug?: string;
          logo_url?: string | null;
          cover_url?: string | null;
          description?: string | null;
          phone?: string | null;
          address?: string | null;
          area?: string | null;
          verification_status?: VendorVerificationStatus;
          is_on_vacation?: boolean;
          vacation_message?: string | null;
          policies?: VendorPolicies;
          business_hours?: BusinessHours;
          commission_rate?: number | null;
          preferred_courier?: string | null;
          preferred_courier_id?: string | null;
          membership_started_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      couriers: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_delivery_rates: {
        Row: {
          id: string;
          vendor_id: string;
          city: string;
          fee: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          city: string;
          fee: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          city?: string;
          fee?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_fee_caps: {
        Row: {
          id: string;
          vendor_id: string | null;
          city: string;
          max_fee: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id?: string | null;
          city: string;
          max_fee: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string | null;
          city?: string;
          max_fee?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courier_rate_slabs: {
        Row: {
          id: string;
          courier_id: string;
          vendor_id: string | null;
          city: string;
          min_weight_kg: number;
          max_weight_kg: number;
          fee: number;
          tax_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          courier_id: string;
          vendor_id?: string | null;
          city: string;
          min_weight_kg: number;
          max_weight_kg: number;
          fee: number;
          tax_percent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          courier_id?: string;
          vendor_id?: string | null;
          city?: string;
          min_weight_kg?: number;
          max_weight_kg?: number;
          fee?: number;
          tax_percent?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          commission_rate: number | null;
          image_url: string | null;
          show_on_homepage: boolean;
          homepage_order: number;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          commission_rate?: number | null;
          image_url?: string | null;
          show_on_homepage?: boolean;
          homepage_order?: number;
          icon?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          show_on_homepage?: boolean;
          homepage_order?: number;
          parent_id?: string | null;
          commission_rate?: number | null;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_follows: {
        Row: {
          customer_id: string;
          vendor_id: string;
          created_at: string;
        };
        Insert: {
          customer_id: string;
          vendor_id: string;
          created_at?: string;
        };
        Update: {
          customer_id?: string;
          vendor_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_categories: {
        Row: {
          vendor_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          vendor_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          vendor_id?: string;
          category_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string | null;
          recipient_role: string | null;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id?: string | null;
          recipient_role?: string | null;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string | null;
          recipient_role?: string | null;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      product_categories: {
        Row: {
          product_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          category_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          vendor_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          description_ur: string | null;
          price: number;
          compare_at_price: number | null;
          sku: string | null;
          stock_quantity: number | null;
          status: ProductStatus;
          brand: string | null;
          tags: string[];
          weight_grams: number | null;
          low_stock_threshold: number;
          seo_title: string | null;
          seo_description: string | null;
          has_360_view: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          description_ur?: string | null;
          price: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock_quantity?: number | null;
          status?: ProductStatus;
          brand?: string | null;
          tags?: string[];
          weight_grams?: number | null;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          has_360_view?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          description_ur?: string | null;
          price?: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock_quantity?: number | null;
          status?: ProductStatus;
          brand?: string | null;
          tags?: string[];
          weight_grams?: number | null;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          has_360_view?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      product_360_images: {
        Row: {
          id: string;
          product_id: string;
          /** null = the spin shown for every colour. */
          variant_id: string | null;
          angle_index: number;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          angle_index: number;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          angle_index?: number;
          url?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          /** null = shown for every colour. */
          variant_id: string | null;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          option_name: string;
          option_value: string;
          price_override: number | null;
          stock_quantity: number | null;
          sku: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          option_name: string;
          option_value: string;
          price_override?: number | null;
          stock_quantity?: number | null;
          sku?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          option_name?: string;
          option_value?: string;
          price_override?: number | null;
          stock_quantity?: number | null;
          sku?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          full_name: string;
          phone: string;
          address_line: string;
          area: string | null;
          city: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label?: string;
          full_name: string;
          phone: string;
          address_line: string;
          area?: string | null;
          city?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          label?: string;
          full_name?: string;
          phone?: string;
          address_line?: string;
          area?: string | null;
          city?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          checkout_group: string;
          order_number: string;
          customer_id: string;
          vendor_id: string;
          address_id: string | null;
          ship_name: string | null;
          ship_phone: string | null;
          ship_address_line: string | null;
          ship_area: string | null;
          ship_city: string | null;
          payment_method: PaymentMethod;
          status: OrderStatus;
          subtotal: number;
          delivery_fee: number;
          total: number;
          commission_rate: number;
          commission_amount: number;
          net_amount: number;
          payout_id: string | null;
          coupon_code: string | null;
          discount_amount: number;
          promotion_id: string | null;
          promotion_discount_amount: number;
          promotion_kmo_funded_amount: number;
          promotion_vendor_funded_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          checkout_group?: string;
          order_number: string;
          customer_id: string;
          vendor_id: string;
          address_id?: string | null;
          ship_name?: string | null;
          ship_phone?: string | null;
          ship_address_line?: string | null;
          ship_area?: string | null;
          ship_city?: string | null;
          payment_method?: PaymentMethod;
          status?: OrderStatus;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          commission_rate?: number;
          commission_amount?: number;
          net_amount?: number;
          payout_id?: string | null;
          coupon_code?: string | null;
          discount_amount?: number;
          promotion_id?: string | null;
          promotion_discount_amount?: number;
          promotion_kmo_funded_amount?: number;
          promotion_vendor_funded_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          checkout_group?: string;
          order_number?: string;
          customer_id?: string;
          vendor_id?: string;
          address_id?: string | null;
          ship_name?: string | null;
          ship_phone?: string | null;
          ship_address_line?: string | null;
          ship_area?: string | null;
          ship_city?: string | null;
          payment_method?: PaymentMethod;
          status?: OrderStatus;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          commission_rate?: number;
          commission_amount?: number;
          net_amount?: number;
          payout_id?: string | null;
          coupon_code?: string | null;
          discount_amount?: number;
          promotion_id?: string | null;
          promotion_discount_amount?: number;
          promotion_kmo_funded_amount?: number;
          promotion_vendor_funded_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name: string;
          variant_label: string | null;
          unit_price: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name: string;
          variant_label?: string | null;
          unit_price: number;
          quantity: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name?: string;
          variant_label?: string | null;
          unit_price?: number;
          quantity?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          image_url: string;
          title: string | null;
          link_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          title?: string | null;
          link_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_url?: string;
          title?: string | null;
          link_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          name: string;
          area: string | null;
          quote: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          area?: string | null;
          quote: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          area?: string | null;
          quote?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: boolean;
          default_commission_rate: number;
          delivery_zones: string[];
          maintenance_mode: boolean;
          vendor_membership_fee: number;
          vendor_free_trial_months: number;
          vendor_agreement_title: string;
          vendor_agreement_body: string;
          vendor_of_week_id: string | null;
          vendor_of_week_image_url: string | null;
          bottom_category_id: string | null;
          show_hero_boxes: boolean;
          show_testimonials: boolean;
          default_delivery_fee: number | null;
          free_delivery_threshold: number | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          default_commission_rate?: number;
          delivery_zones?: string[];
          maintenance_mode?: boolean;
          vendor_membership_fee?: number;
          vendor_free_trial_months?: number;
          vendor_agreement_title?: string;
          vendor_agreement_body?: string;
          vendor_of_week_id?: string | null;
          vendor_of_week_image_url?: string | null;
          bottom_category_id?: string | null;
          show_hero_boxes?: boolean;
          show_testimonials?: boolean;
          default_delivery_fee?: number | null;
          free_delivery_threshold?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          default_commission_rate?: number;
          delivery_zones?: string[];
          maintenance_mode?: boolean;
          vendor_membership_fee?: number;
          vendor_free_trial_months?: number;
          vendor_agreement_title?: string;
          vendor_agreement_body?: string;
          vendor_of_week_id?: string | null;
          vendor_of_week_image_url?: string | null;
          bottom_category_id?: string | null;
          show_hero_boxes?: boolean;
          show_testimonials?: boolean;
          default_delivery_fee?: number | null;
          free_delivery_threshold?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payouts: {
        Row: {
          id: string;
          vendor_id: string;
          amount: number;
          status: PayoutStatus;
          transaction_reference: string | null;
          notes: string | null;
          payout_date: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          amount: number;
          status?: PayoutStatus;
          transaction_reference?: string | null;
          notes?: string | null;
          payout_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          amount?: number;
          status?: PayoutStatus;
          transaction_reference?: string | null;
          notes?: string | null;
          payout_date?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_membership_charges: {
        Row: {
          id: string;
          vendor_id: string;
          period_start: string;
          period_end: string;
          amount: number;
          status: "due" | "paid" | "waived";
          paid_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          period_start: string;
          period_end: string;
          amount: number;
          status?: "due" | "paid" | "waived";
          paid_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          period_start?: string;
          period_end?: string;
          amount?: number;
          status?: "due" | "paid" | "waived";
          paid_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string;
          order_item_id: string | null;
          rating: number;
          body: string | null;
          vendor_reply: string | null;
          vendor_reply_at: string | null;
          is_flagged: boolean;
          flag_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id: string;
          order_item_id?: string | null;
          rating: number;
          body?: string | null;
          vendor_reply?: string | null;
          vendor_reply_at?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          customer_id?: string;
          order_item_id?: string | null;
          rating?: number;
          body?: string | null;
          vendor_reply?: string | null;
          vendor_reply_at?: string | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      returns: {
        Row: {
          id: string;
          order_id: string;
          order_item_id: string | null;
          customer_id: string;
          reason: string;
          status: ReturnStatus;
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          order_item_id?: string | null;
          customer_id: string;
          reason: string;
          status?: ReturnStatus;
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          order_item_id?: string | null;
          customer_id?: string;
          reason?: string;
          status?: ReturnStatus;
          admin_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          vendor_id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          amount: number;
          expires_at: string | null;
          status: CouponStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          code: string;
          description?: string | null;
          discount_type?: DiscountType;
          amount: number;
          expires_at?: string | null;
          status?: CouponStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          code?: string;
          description?: string | null;
          discount_type?: DiscountType;
          amount?: number;
          expires_at?: string | null;
          status?: CouponStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          customer_id: string;
          vendor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          vendor_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          vendor_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          phone: string;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      product_questions: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string;
          question: string;
          answer: string | null;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id: string;
          question: string;
          answer?: string | null;
          answered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          customer_id?: string;
          question?: string;
          answer?: string | null;
          answered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      promotions: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string | null;
          vendor_id: string | null;
          category_id: string | null;
          /** 'percentage' → discount_value is % off. 'fixed' → it's the sale price. */
          discount_type: "percentage" | "fixed";
          discount_value: number;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          sort_order: number;
          /** Who absorbs the discount at checkout. */
          funded_by: "kmo" | "vendor";
          /** The vendor's share of the discount, 0-100. Always 0 for 'kmo',
           *  always 100 for 'vendor'; only meaningful to set for 'shared'. */
          vendor_funded_percent: number;
          /** Caps KMO/vendor exposure per order — e.g. "20% off, up to Rs. 300". */
          max_discount_amount: number | null;
          /** Order must reach this pre-discount subtotal to qualify. */
          min_order_amount: number | null;
          /** Label shown on promoted products; null shows the "-X%" badge. */
          badge_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url?: string | null;
          vendor_id?: string | null;
          category_id?: string | null;
          discount_type: "percentage" | "fixed";
          discount_value: number;
          starts_at?: string;
          ends_at: string;
          is_active?: boolean;
          sort_order?: number;
          funded_by?: "kmo" | "vendor";
          vendor_funded_percent?: number;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          badge_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          image_url?: string | null;
          vendor_id?: string | null;
          category_id?: string | null;
          discount_type?: "percentage" | "fixed";
          discount_value?: number;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          sort_order?: number;
          funded_by?: "kmo" | "vendor";
          vendor_funded_percent?: number;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          badge_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      promotion_products: {
        Row: {
          promotion_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          promotion_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          promotion_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      category_product_counts: {
        Row: { category_id: string; product_count: number };
        Relationships: [];
      };
    };
    Functions: {
      is_valid_preview_token: {
        Args: { candidate: string };
        Returns: boolean;
      };
      get_preview_token: {
        Args: never;
        Returns: string | null;
      };
      regenerate_preview_token: {
        Args: never;
        Returns: string;
      };
      admin_vendor_owner_email: {
        Args: { p_vendor_id: string };
        Returns: string;
      };
      track_order: {
        Args: { p_order_number: string; p_email: string };
        Returns: {
          order_number: string;
          status: Database["public"]["Enums"]["order_status"];
          total: number;
          payment_method: string;
          created_at: string;
        }[];
      };
      admin_list_users: {
        Args: never;
        Returns: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          pending_vendor: boolean;
          admin_modules: string[];
          created_at: string;
        }[];
      };
      admin_set_user_role: {
        Args: { target_id: string; new_role: UserRole; modules?: string[] | null };
        Returns: undefined;
      };      top_categories: {
        Args: { limit_count?: number };
        Returns: {
          id: string;
          name: string;
          slug: string;
          image_url: string | null;
          sold_count: number;
          product_count: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      vendor_verification_status: VendorVerificationStatus;
      product_status: ProductStatus;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payout_status: PayoutStatus;
      return_status: ReturnStatus;
      discount_type: DiscountType;
      coupon_status: CouponStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
