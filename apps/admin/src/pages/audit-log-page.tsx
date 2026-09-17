import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

export function AuditLogPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => listAuditLogs(supabase),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr] bg-surface-alt px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-table">
        <span>Admin</span>
        <span>Action</span>
        <span>Target</span>
        <span>When</span>
      </div>
      {isLoading ? (
        <p className="p-5 text-sm text-muted">Loading…</p>
      ) : !logs || logs.length === 0 ? (
        <p className="p-5 text-sm text-muted">No admin actions logged yet.</p>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="grid grid-cols-[1fr_1.5fr_1fr_1fr] items-center border-t border-[#F5F0EE] px-5 py-3.5 text-[13px]"
          >
            <span className="font-bold text-ink-dark">{log.profiles?.full_name ?? "Admin"}</span>
            <span className="font-mono text-[12px] text-primary">{log.action}</span>
            <span className="text-muted">
              {log.target_type}
              {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ""}
            </span>
            <span className="text-muted">
              {new Date(log.created_at).toLocaleString(undefined, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
