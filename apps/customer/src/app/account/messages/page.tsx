"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCustomerConversations, listMessages, sendMessage } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm text-muted">Loading…</p>}>
      <RequireAuth allowedRoles={["customer"]}>
        <MessagesContent />
      </RequireAuth>
    </Suspense>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("c");
  const [activeId, setActiveId] = useState<string | null>(preselected);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["customer-conversations", user?.id],
    queryFn: () => listCustomerConversations(supabase, user!.id),
    enabled: !!user,
  });

  const active = conversations?.find((c) => c.id === (activeId ?? preselected)) ?? conversations?.[0];

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        Messages
      </h1>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !conversations || conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          No conversations yet — start one from a store page.
        </div>
      ) : (
        <div className="grid h-[560px] grid-cols-[240px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-y-auto border-r border-border">
            {conversations.map((c) => {
              const last = c.messages.at(-1);
              const isActive = active?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className="flex w-full flex-col gap-1 border-b border-[#F5F0EE] p-3.5 text-left"
                  style={{ background: isActive ? "var(--color-primary-tint)" : "transparent" }}
                >
                  <span className="text-[13px] font-bold text-ink-dark">{c.vendors?.store_name}</span>
                  <p className="line-clamp-1 text-xs text-muted">{last?.body ?? "No messages yet"}</p>
                </button>
              );
            })}
          </div>
          {active ? <Thread conversationId={active.id} /> : null}
        </div>
      )}
    </div>
  );
}

function Thread({ conversationId }: { conversationId: string }) {
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
      queryClient.invalidateQueries({ queryKey: ["customer-conversations"] });
      setDraft("");
    },
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {messages?.map((m) => {
            const outgoing = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className="max-w-[70%] rounded-lg px-3.5 py-2.5 text-[13px]"
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
          className="flex-1 rounded-full border border-border px-4 py-2.5 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!draft.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
          className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
