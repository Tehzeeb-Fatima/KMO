/**
 * Hand-maintained until the schema stabilizes. Once migrations settle,
 * regenerate with:
 *   pnpm dlx supabase gen types typescript --project-id igjrtfgnlvepemdehbdn > packages/shared/src/types/database.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "customer" | "vendor" | "admin";
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
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          pending_vendor?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          pending_vendor?: boolean;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          commission_rate?: number | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
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
          price: number;
          compare_at_price: number | null;
          sku: string | null;
          stock_quantity: number;
          status: ProductStatus;
          brand: string | null;
          tags: string[];
          weight_grams: number | null;
          low_stock_threshold: number;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock_quantity?: number;
          status?: ProductStatus;
          brand?: string | null;
          tags?: string[];
          weight_grams?: number | null;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          sku?: string | null;
          stock_quantity?: number;
          status?: ProductStatus;
          brand?: string | null;
          tags?: string[];
          weight_grams?: number | null;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
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
          stock_quantity: number;
          sku: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          option_name: string;
          option_value: string;
          price_override?: number | null;
          stock_quantity?: number;
          sku?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          option_name?: string;
          option_value?: string;
          price_override?: number | null;
          stock_quantity?: number;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          checkout_group?: string;
          order_number: string;
          customer_id: string;
          vendor_id: string;
          address_id?: string | null;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          checkout_group?: string;
          order_number?: string;
          customer_id?: string;
          vendor_id?: string;
          address_id?: string | null;
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
      platform_settings: {
        Row: {
          id: boolean;
          default_commission_rate: number;
          delivery_zones: string[];
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          default_commission_rate?: number;
          delivery_zones?: string[];
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          default_commission_rate?: number;
          delivery_zones?: string[];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
