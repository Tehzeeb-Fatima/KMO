import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerProductQuestion,
  getMyVendor,
  listVendorQuestions,
  listVendorReviews,
  replyToReview,
} from "@kmo/shared/api";
import { supabase } from "../lib/supabase";

export function ReviewsPage() {
  const { data: vendor } = useQuery({ queryKey: ["my-vendor"], queryFn: () => getMyVendor(supabase) });
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["vendor-reviews", vendor?.id],
    queryFn: () => listVendorReviews(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const { data: questions } = useQuery({
    queryKey: ["vendor-questions", vendor?.id],
    queryFn: () => listVendorQuestions(supabase, vendor!.id),
    enabled: !!vendor,
  });

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => replyToReview(supabase, id, reply),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-reviews", vendor?.id] }),
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      answerProductQuestion(supabase, id, answer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-questions", vendor?.id] }),
  });

  const unanswered = questions?.filter((q) => !q.answer) ?? [];

  if (isLoading) return <p className="text-sm text-muted">Loading reviews…</p>;

  return (
    <div className="flex flex-col gap-6">
      {unanswered.length > 0 ? (
        <div>
          <p className="mb-3 text-[15px] font-bold text-ink">
            Questions awaiting a reply ({unanswered.length})
          </p>
          <div className="flex flex-col gap-3.5">
            {unanswered.map((q) => (
              <div key={q.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-[18px_20px]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold text-ink">
                    {q.profiles?.full_name ?? "Customer"}
                  </span>
                  <span className="text-[11px] text-muted-table">on {q.products.name}</span>
                </div>
                <p className="text-[12.5px] text-ink-dark">
                  <span className="font-mono font-bold text-primary">Q:</span> {q.question}
                </p>
                <div className="flex gap-2">
                  <input
                    placeholder="Write an answer…"
                    value={answerDrafts[q.id] ?? ""}
                    onChange={(e) => setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="flex-1 rounded-[7px] border border-border px-3 py-2.5 text-[12.5px] outline-none focus:border-primary-light"
                  />
                  <button
                    type="button"
                    disabled={!answerDrafts[q.id]?.trim() || answerMutation.isPending}
                    onClick={() => answerMutation.mutate({ id: q.id, answer: answerDrafts[q.id] })}
                    className="rounded-[7px] bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Answer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-[15px] font-bold text-ink">Reviews</p>
        {!reviews || reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
            No reviews yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-[18px_20px]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold text-ink">{r.profiles?.full_name ?? "Customer"}</span>
                  <span className="text-xs text-accent">{"★".repeat(r.rating)}</span>
                  <span className="text-[11px] text-muted-table">on {r.products.name}</span>
                </div>
                <p className="text-[12.5px] text-ink-dark">{r.body}</p>

                {r.vendor_reply ? (
                  <div className="rounded-lg bg-primary-tint px-3 py-2.5 text-xs text-primary">
                    <strong className="font-bold">Your reply:</strong> {r.vendor_reply}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      placeholder="Write a reply…"
                      value={replyDrafts[r.id] ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="flex-1 rounded-[7px] border border-border px-3 py-2.5 text-[12.5px] outline-none focus:border-primary-light"
                    />
                    <button
                      type="button"
                      disabled={!replyDrafts[r.id]?.trim() || replyMutation.isPending}
                      onClick={() => replyMutation.mutate({ id: r.id, reply: replyDrafts[r.id] })}
                      className="rounded-[7px] bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
