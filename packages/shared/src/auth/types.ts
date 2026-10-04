export type UserRole = "customer" | "vendor" | "admin" | "staff";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  pending_vendor: boolean;
  admin_modules: string[];
  created_at: string;
}
