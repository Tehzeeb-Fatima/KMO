export type UserRole = "customer" | "vendor" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  pending_vendor: boolean;
  created_at: string;
}
