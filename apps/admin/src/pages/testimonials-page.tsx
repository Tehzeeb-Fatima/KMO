import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTestimonial,
  deleteTestimonial,
  getPlatformSettings,
  listAllTestimonials,
  logAdminAction,
  updatePlatformSettings,
  updateTestimonial,
  type TestimonialRow,
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

const inputClass =
  "rounded-lg border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary-light";

export function TestimonialsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: () => listAllTestimonials(supabase),
  });

  const showSection = settings?.show_testimonials === true;
  const toggleSection = useMutation({
    mutationFn: (next: boolean) => updatePlatformSettings(supabase, { show_testimonials: next }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      if (user) void logAdminAction(supabase, user.id, "settings.show_testimonials", "platform_settings");
    },
  });

  // One form handles both "add" (editing === null) and "edit".
  const [editing, setEditing] = useState<TestimonialRow | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [quote, setQuote] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditing(null);
    setName("");
    setArea("");
    setQuote("");
    setSortOrder("0");
    setError(null);
  }

  function startEdit(row: TestimonialRow) {
    setEditing(row);
    setName(row.name);
    setArea(row.area ?? "");
    setQuote(row.quote);
    setSortOrder(String(row.sort_order));
    setError(null);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Enter the customer's name.");
      if (!quote.trim()) throw new Error("Enter what the customer said.");
      const payload = {
        name: name.trim(),
        area: area.trim() || null,
        quote: quote.trim(),
        sort_order: Number(sortOrder) || 0,
      };
      return editing
        ? updateTestimonial(supabase, editing.id, payload)
        : createTestimonial(supabase, { ...payload, is_active: true });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      if (user) {
        void logAdminAction(supabase, user.id, editing ? "testimonial.update" : "testimonial.create", "testimonial", saved.id);
      }
      resetForm();
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateTestimonial(supabase, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] }),
  });

  const [pendingDelete, setPendingDelete] = useState<TestimonialRow | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTestimonial(supabase, id),
    onSuccess: (_v, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      if (user) void logAdminAction(supabase, user.id, "testimonial.delete", "testimonial", id);
      if (editing?.id === id) resetForm();
      setPendingDelete(null);
    },
  });

  const activeCount = testimonials?.filter((t) => t.is_active).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-[640px] items-center justify-between gap-4 rounded-xl border border-border bg-surface p-[22px_24px]">
        <div className="flex flex-col gap-[3px]">
          <p className="text-[15px] font-bold text-ink">Show testimonials on homepage</p>
          <p className="text-xs text-muted">
            {showSection
              ? activeCount > 0
                ? `On — ${activeCount} testimonial${activeCount === 1 ? "" : "s"} showing.`
                : "On, but nothing shows until you add an active testimonial."
              : "Off — the section is hidden on the homepage."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showSection}
          disabled={!settings || toggleSection.isPending}
          onClick={() => toggleSection.mutate(!showSection)}
          className="flex h-[23px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors disabled:opacity-60"
          style={{
            background: showSection ? "var(--color-accent)" : "var(--color-border)",
            justifyContent: showSection ? "flex-end" : "flex-start",
          }}
        >
          <span className="h-[19px] w-[19px] rounded-full bg-white" />
        </button>
      </div>

      <div className="flex max-w-[640px] flex-col gap-3.5 rounded-xl border border-border bg-surface p-[22px_24px]">
        <p className="text-[15px] font-bold text-ink">{editing ? "Edit testimonial" : "Add testimonial"}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_90px]">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Customer name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha R." className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Area (optional)</span>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Gulshan-e-Iqbal, Karachi" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-ink-dark">Order</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-ink-dark">What they said</span>
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={4} className={inputClass} />
        </label>
        {error ? <p className="text-[12.5px] font-semibold text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-[7px] bg-accent px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Add testimonial"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-[7px] border border-border bg-white px-5 py-2.5 text-[13px] font-bold text-primary"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex max-w-[860px] flex-col gap-3">
        <p className="text-[15px] font-bold text-ink">Testimonials</p>
        {isLoading ? <p className="text-sm text-muted">Loading…</p> : null}
        {!isLoading && (testimonials?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            No testimonials yet.
          </div>
        ) : null}
        {testimonials?.map((row) => (
          <div key={row.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[13.5px] font-bold text-ink-dark">
                {row.name}
                {row.area ? <span className="font-normal text-muted-table"> · {row.area}</span> : null}
                {!row.is_active ? <span className="ml-2 text-[11px] font-bold text-muted">(hidden)</span> : null}
              </span>
              <span className="text-[12.5px] leading-relaxed text-muted">&ldquo;{row.quote}&rdquo;</span>
              <span className="text-[11px] text-muted-table">Order {row.sort_order}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => toggleMutation.mutate({ id: row.id, is_active: !row.is_active })}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary"
              >
                {row.is_active ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(row)}
                className="rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete ${pendingDelete?.name ?? "this"}'s testimonial?`}
        message="It will be removed from the homepage."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
