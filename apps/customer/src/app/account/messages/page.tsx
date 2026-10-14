"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Headset } from "lucide-react";
import {
  getCustomerAdminConversation,
  getOrCreateAdminCustomerConversation,
  listCustomerConversations,
  listMessages,
  sendMessage,
} from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { RequireAuth } from "@/components/require-auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";
import { PageLoader, ListSkeleton } from "@/components/page-loader";

type Active = { id: string; kind: "vendor" | "admin" };

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RequireAuth allowedRoles={["customer"]}>
        <MessagesContent />
      </RequireAuth>
    </Suspense>
  );
}

function MessagesContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("c");
  const [active, setActive] = useState<Active | null>(preselected ? { id: preselected, kind: "vendor" } : null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(!!preselected);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["customer-conversations", user?.id],
    queryFn: () => listCustomerConversations(supabase, user!.id),
    enabled: !!user,
  });
  const { data: adminConv } = useQuery({
    queryKey: ["customer-admin-conversation", user?.id],
    queryFn: () => getCustomerAdminConversation(supabase, user!.id),
    enabled: !!user,
  });

  const startAdminChat = useMutation({
    mutationFn: () => getOrCreateAdminCustomerConversation(supabase, user!.id),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["customer-admin-conversation", user?.id] });
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
    setActive({ id, kind: "vendor" });
    setMobileThreadOpen(true);
  }

  const effectiveActive: Active | null =
    active ?? (conversations && conversations.length > 0 ? { id: conversations[0].id, kind: "vendor" } : null);
  const activeVendorConv =
    effectiveActive?.kind === "vendor" ? conversations?.find((c) => c.id === effectiveActive.id) : undefined;

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-2xl">
        {t.account.messagesTitle}
      </h1>

      {isLoading ? (
        <ListSkeleton rows={4} rowClassName="h-16" />
      ) : (
        <div className="grid h-[560px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[240px_minmax(0,1fr)]">
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
              <p className="p-3.5 text-xs text-muted">{t.account.noConversationsYet}</p>
            ) : (
              conversations.map((c) => {
                const last = c.messages.at(-1);
                const isActive = effectiveActive?.kind === "vendor" && effectiveActive.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className="flex w-full flex-col gap-1 border-b border-[#F5F0EE] p-3.5 text-left"
                    style={{ background: isActive ? "var(--color-primary-tint)" : "transparent" }}
                  >
                    <span className="text-[13px] font-bold text-ink-dark">{c.vendors?.store_name}</span>
                    <p className="line-clamp-1 text-xs text-muted">{last?.body ?? t.account.noMessagesShort}</p>
                  </button>
                );
              })
            )}
          </div>
          {effectiveActive ? (
            <div className={cn("flex-col sm:flex", mobileThreadOpen ? "flex" : "hidden")}>
              <Thread
                conversationId={effectiveActive.id}
                title={effectiveActive.kind === "admin" ? "KMO Support" : activeVendorConv?.vendors?.store_name}
                onBack={() => setMobileThreadOpen(false)}
              />
            </div>
          ) : (
            <div className="hidden items-center justify-center p-8 text-center text-sm text-muted sm:flex">
              Select a conversation, or message KMO Support.
            </div>
          )}
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
  const { t } = useLanguage();
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
      queryClient.invalidateQueries({ queryKey: ["customer-admin-conversation"] });
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
        <span className="truncate text-[13px] font-bold text-ink-dark">{title}</span>
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
          placeholder={t.account.writeMessagePlaceholder}
          className="min-w-0 flex-1 rounded-full border border-border px-4 py-2.5 text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!draft.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {t.account.send}
        </button>
      </div>
    </div>
  );
}
