import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;
type UserRole = Database["public"]["Enums"]["user_role"];

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  pending_vendor: boolean;
  admin_modules: string[];
  created_at: string;
}

export async function listAdminUsers(supabase: Client): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return data;
}

export async function setUserRole(
  supabase: Client,
  userId: string,
  role: UserRole,
  modules: string[] = [],
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", { target_id: userId, new_role: role, modules });
  if (error) throw error;
}