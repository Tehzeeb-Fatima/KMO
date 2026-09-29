"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitContactMessage } from "@kmo/shared/api";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ContactPage() {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitContactMessage(supabase, { firstName, lastName, phone, message }),
  });

  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{t.contact.getInTouch}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">{t.contact.haveQuestion}</h1>
      <p className="mt-3 text-sm text-muted">
        {t.contact.contactPageSubtitle}
      </p>

      {mutation.isSuccess ? (
        <p className="mt-6 rounded-xl border border-success-border bg-success-tint p-4 text-sm font-semibold text-success-dark">
          {t.contact.thanksMessageShort}
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
              placeholder={t.contact.firstName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
            <input
              required
              placeholder={t.contact.lastName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
            />
          </div>
          <input
            required
            type="tel"
            placeholder={t.contact.phoneNumber}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          <textarea
            required
            rows={4}
            placeholder={t.contact.howCanWeHelp}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-y rounded-lg border border-border px-[13px] py-[11px] text-[13.5px] outline-none focus:border-primary-light"
          />
          {mutation.isError ? (
            <p className="text-sm text-danger">{t.contact.somethingWentWrong}</p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-fit rounded-[10px] bg-accent px-[26px] py-[13px] text-sm font-bold text-white disabled:opacity-60"
          >
            {mutation.isPending ? t.contact.sending : t.contact.sendMessage}
          </button>
        </form>
      )}
    </main>
  );
}
