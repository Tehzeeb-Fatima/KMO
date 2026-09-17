import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listContactMessages, markContactMessageResolved } from "@kmo/shared/api";
import { StatusBadge } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

export function ContactMessagesPage() {
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => listContactMessages(supabase),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => markContactMessageResolved(supabase, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
  });

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;

  if (!messages || messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
        No messages submitted yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {messages.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-surface p-[18px_20px]">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink-dark">
              {m.first_name} {m.last_name} · {m.phone}
            </p>
            <StatusBadge variant={m.status === "resolved" ? "success" : "warning"}>
              {m.status === "resolved" ? "Resolved" : "New"}
            </StatusBadge>
          </div>
          <p className="mt-1.5 text-[12.5px] text-ink-dark">{m.message}</p>
          <p className="mt-1 text-[11px] text-muted-table">
            {new Date(m.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          {m.status !== "resolved" ? (
            <button
              type="button"
              onClick={() => resolveMutation.mutate(m.id)}
              className="mt-2 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Mark resolved
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
