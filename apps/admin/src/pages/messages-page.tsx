import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrCreateAdminCustomerConversation,
  getOrCreateAdminVendorConversation,
  listAdminCustomerConversations,
  listAdminVendorConversations,
  listConversationsForAdminOversight,
  listCustomers,
  listMessages,
  listVendors,
  sendMessage,
} from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

type Tab = "oversight" | "customers" | "vendors";

export function MessagesPage() {
  const [tab, setTab] = useState<Tab>("oversight");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(
          [
            { value: "oversight", label: "Customer ↔ Vendor" },
            { value: "customers", label: "Customers" },
            { value: "vendors", label: "Vendors" },
          ] as { value: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className="rounded-full px-[15px] py-2 text-[12.5px] font-bold"
            style={
              tab === t.value
                ? { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" }
                : { background: "#fff", color: "var(--color-primary)", border: "1px solid var(--color-border)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "oversight" ? <OversightPanel /> : tab === "customers" ? <CustomersPanel /> : <VendorsPanel />}
    </div>
  );
}

/** Read-only - admin can see every customer<->vendor chat, but never sends into one. */
function OversightPanel() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["admin-oversight-conversations"],
    queryFn: () => listConversationsForAdminOversight(supabase),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = conversations?.find((c) => c.id === activeId) ?? conversations?.[0];

  if (isLoading) return <p className="text-sm text-muted">Loading...</p>;
  if (!conversations || conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
        No customer-vendor conversations yet.
      </div>
    );
  }

  return (
    <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[300px_minmax(0,1fr)]">
      <div className="overflow-y-auto border-border sm:border-r">
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
              <span className="text-[13px] font-bold text-ink-dark">
                {c.profiles?.full_name ?? "Customer"} <span className="font-normal text-muted">{"↔"}</span>{" "}
                {c.vendors?.store_name}
              </span>
              <p className="line-clamp-1 text-xs text-muted">{last?.body ?? "No messages yet"}</p>
            </button>
          );
        })}
      </div>
      {active ? <ReadOnlyThread conversationId={active.id} /> : null}
    </div>
  );
}

function ReadOnlyThread({ conversationId }: { conversationId: string }) {
  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(supabase, conversationId),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border p-3 text-[12px] text-muted">
        Read-only &mdash; admin doesn&rsquo;t send into customer-vendor chats.
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {messages?.map((m) => (
            <div
              key={m.id}
              className="max-w-[70%] rounded-lg px-3.5 py-2.5 text-[13px]"
              style={{ background: "var(--color-surface-alt)", color: "var(--color-ink-dark)" }}
            >
              {m.body}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomersPanel() {
  const queryClient = useQueryClient();
  const { data: conversations } = useQuery({
    queryKey: ["admin-customer-conversations"],
    queryFn: () => listAdminCustomerConversations(supabase),
  });
  const { data: customers } = useQuery({
    queryKey: ["admin-customers-for-messages"],
    queryFn: () => listCustomers(supabase),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState("");

  const startChat = useMutation({
    mutationFn: (customerId: string) => getOrCreateAdminCustomerConversation(supabase, customerId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-conversations"] });
      setActiveId(conv.id);
      setPickerId("");
    },
  });

  const active = conversations?.find((c) => c.id === activeId) ?? conversations?.[0];
  const startedCustomerIds = new Set((conversations ?? []).map((c) => c.customer_id));

  return (
    <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col overflow-hidden border-border sm:border-r">
        <div className="flex gap-2 border-b border-border p-2.5">
          <select
            value={pickerId}
            onChange={(e) => setPickerId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-2 text-[12.5px] text-ink-dark"
          >
            <option value="">Message a customer...</option>
            {customers
              ?.filter((c) => !startedCustomerIds.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? "Customer"}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!pickerId || startChat.isPending}
            onClick={() => startChat.mutate(pickerId)}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
          >
            Start
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!conversations || conversations.length === 0 ? (
            <p className="p-3.5 text-xs text-muted">No conversations yet &mdash; pick a customer above.</p>
          ) : (
            conversations.map((c) => {
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
                  <span className="text-[13px] font-bold text-ink-dark">{c.profiles?.full_name ?? "Customer"}</span>
                  <p className="line-clamp-1 text-xs text-muted">{last?.body ?? "No messages yet"}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
      {active ? (
        <AdminThread conversationId={active.id} invalidateKey="admin-customer-conversations" />
      ) : (
        <div className="hidden items-center justify-center p-8 text-center text-sm text-muted sm:flex">
          Pick a customer to start messaging.
        </div>
      )}
    </div>
  );
}

function VendorsPanel() {
  const queryClient = useQueryClient();
  const { data: conversations } = useQuery({
    queryKey: ["admin-vendor-conversations"],
    queryFn: () => listAdminVendorConversations(supabase),
  });
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-for-messages"],
    queryFn: () => listVendors(supabase),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState("");

  const startChat = useMutation({
    mutationFn: (vendorId: string) => getOrCreateAdminVendorConversation(supabase, vendorId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-conversations"] });
      setActiveId(conv.id);
      setPickerId("");
    },
  });

  const active = conversations?.find((c) => c.id === activeId) ?? conversations?.[0];
  const startedVendorIds = new Set((conversations ?? []).map((c) => c.vendor_id));

  return (
    <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col overflow-hidden border-border sm:border-r">
        <div className="flex gap-2 border-b border-border p-2.5">
          <select
            value={pickerId}
            onChange={(e) => setPickerId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-2 text-[12.5px] text-ink-dark"
          >
            <option value="">Message a vendor...</option>
            {vendors
              ?.filter((v) => !startedVendorIds.has(v.id))
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.store_name}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!pickerId || startChat.isPending}
            onClick={() => startChat.mutate(pickerId)}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
          >
            Start
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!conversations || conversations.length === 0 ? (
            <p className="p-3.5 text-xs text-muted">No conversations yet &mdash; pick a vendor above.</p>
          ) : (
            conversations.map((c) => {
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
            })
          )}
        </div>
      </div>
      {active ? (
        <AdminThread conversationId={active.id} invalidateKey="admin-vendor-conversations" />
      ) : (
        <div className="hidden items-center justify-center p-8 text-center text-sm text-muted sm:flex">
          Pick a vendor to start messaging.
        </div>
      )}
    </div>
  );
}

function AdminThread({ conversationId, invalidateKey }: { conversationId: string; invalidateKey: string }) {
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
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      setDraft("");
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
          placeholder="Write a message..."
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
