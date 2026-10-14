import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Headset } from "lucide-react";
import {
  getMyVendor,
  getOrCreateAdminVendorConversation,
  getVendorAdminConversation,
  listMessages,
  listVendorConversations,
  sendMessage,
} from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { cn } from "cn";
import { supabase } from "../lib/supabase";

type Active = { id: string; kind: "customer" | "admin" };

export function MessagesPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["vendor-conversations", vendor?.id],
    queryFn: () => listVendorConversations(supabase, vendor!.id),
    enabled: !!vendor,
  });
  const { data: adminConv } = useQuery({
    queryKey: ["vendor-admin-conversation", vendor?.id],
    queryFn: () => getVendorAdminConversation(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const [active, setActive] = useState<Active | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const startAdminChat = useMutation({
    mutationFn: () => getOrCreateAdminVendorConversation(supabase, vendor!.id),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-admin-conversation", vendor?.id] });
      setActive({ id: conv.id, kind: "admin" });
      setMobileThreadOpen(true);
    },
  });

  function openAdminChat() {
    if (adminConv) {
      setActive({ id: adminConv.id, kind: "admin" });
      setMobileThreadOpen(true);
    } else {
      startAdminChat.mutate();
    }
  }

  function openConversation(id: string) {
    setActive({ id, kind: "customer" });
    setMobileThreadOpen(true);
  }

  const effectiveActive: Active | null =
    active ?? (conversations && conversations.length > 0 ? { id: conversations[0].id, kind: "customer" } : null);
  const activeCustomerConv =
    effectiveActive?.kind === "customer" ? conversations?.find((c) => c.id === effectiveActive.id) : undefined;

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[280px_minmax(0,1fr)]">
      <div
        className={cn(
          "overflow-y-auto border-border sm:block sm:border-r",
          mobileThreadOpen ? "hidden" : "block",
        )}
      >
        <button
          type="button"
          onClick={openAdminChat}
          className="flex w-full items-center gap-2.5 border-b border-[#F5F0EE] p-3.5 text-left"
          style={{ background: effectiveActive?.kind === "admin" ? "var(--color-primary-tint)" : "transparent" }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <Headset className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-ink-dark">KMO Support</span>
            <p className="line-clamp-1 text-xs text-muted">
              {adminConv?.messages.at(-1)?.body ?? "Message the KMO team"}
            </p>
          </div>
        </button>

        {!conversations || conversations.length === 0 ? (
          <p className="p-3.5 text-xs text-muted">No customer messages yet.</p>
        ) : (
          conversations.map((c) => {
            const last = c.messages.at(-1);
            const isActive = effectiveActive?.kind === "customer" && effectiveActive.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className="flex w-full flex-col gap-1 border-b border-[#F5F0EE] p-3.5 text-left"
                style={{ background: isActive ? "var(--color-primary-tint)" : "transparent" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink-dark">
                    {c.profiles?.full_name ?? "Customer"}
                  </span>
                  {last ? (
                    <span className="text-[10px] text-muted-table">
                      {new Date(last.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-1 text-xs text-muted">{last?.body ?? "No messages yet"}</p>
              </button>
            );
          })
        )}
      </div>

      {effectiveActive ? (
        <div className={cn("flex-col sm:flex", mobileThreadOpen ? "flex" : "hidden")}>
          <Thread
            conversationId={effectiveActive.id}
            title={effectiveActive.kind === "admin" ? "KMO Support" : (activeCustomerConv?.profiles?.full_name ?? "Customer")}
            onBack={() => setMobileThreadOpen(false)}
          />
        </div>
      ) : (
        <div className="hidden items-center justify-center p-8 text-center text-sm text-muted sm:flex">
          Select a conversation, or message KMO Support.
        </div>
      )}
    </div>
  );
}

function Thread({
  conversationId,
  title,
  onBack,
}: {
  conversationId: string;
  title?: string | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(supabase, conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(supabase, conversationId, user!.id, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-admin-conversation"] });
      setDraft("");
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-3 sm:hidden">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-surface-alt"
        >
          <ChevronLeft className="h-[18px] w-[18px] text-ink-dark" />
        </button>
        <span className="truncate text-[13px] font-bold text-ink-dark">{title ?? "Customer"}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {messages?.map((m) => {
            const outgoing = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className="max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] sm:max-w-[70%]"
                style={{
                  alignSelf: outgoing ? "flex-end" : "flex-start",
                  background: outgoing ? "var(--color-primary)" : "var(--color-primary-tint)",
                  color: outgoing ? "#fff" : "var(--color-ink-dark)",
                }}
              >
                {m.body}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) sendMutation.mutate();
          }}
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded-full border border-border px-4 py-2.5 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!draft.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
