import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../types";

type Client = SupabaseClient<Database>;
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export async function logAdminAction(
  supabase: Client,
  actorId: string,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, Json>,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? {},
  });
  if (error) throw error;
}

export interface AuditLogWithActor extends AuditLogRow {
  profiles: { full_name: string | null } | null;
}

export async function listAuditLogs(supabase: Client): Promise<AuditLogWithActor[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as unknown as AuditLogWithActor[];
}
