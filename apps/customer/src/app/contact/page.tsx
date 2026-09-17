"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitContactMessage } from "@kmo/shared/api";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitContactMessage(supabase, { firstName, lastName, phone, message }),
  });

  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Get in touch</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">Contact us</h1>
      <p className="mt-3 text-sm text-muted">
        Questions about an order, a store, or becoming a vendor on KMO? Send us a message and
        our team will get back to you.
      </p>

      {mutation.isSuccess ? (
        <p className="mt-6 rounded-xl border border-success-border bg-success-tint p-4 text-sm font-semibold text-success-dark">
          Thanks — we&rsquo;ve received your message and will reply soon.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-6 flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
            <input
              required
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </div>
          <input
            required
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          <textarea
            required
            rows={4}
            placeholder="How can we help?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-y rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          {mutation.isError ? (
            <p className="text-sm text-danger">Something went wrong — please try again.</p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-fit rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
          >
            {mutation.isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </main>
  );
}
