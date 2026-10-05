"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";

type Mode = "request" | "verifying" | "set-password" | "done";

const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.karachimartonline.com";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.karachimartonline.com";

// Captured at module load, before the Supabase client (initialised by the
// import above) strips the auth fragment from the URL.
const INITIAL_HASH = typeof window !== "undefined" ? window.location.hash : "";
const ARRIVED_WITH_SET_PASSWORD_LINK = /type=(invite|recovery)/.test(INITIAL_HASH);

/**
 * Two purposes, one URL: visiting directly (e.g. from the login page's
 * "Forgot password?" link) shows the "send me a reset link" form; arriving
 * via the emailed recovery link fires Supabase's PASSWORD_RECOVERY event,
 * which switches this same page into "set a new password" mode. This is
 * also how a guest who checked out without a password (see /checkout)
 * activates their account for good.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("set-password");
    });

    // Invite / recovery emails link here as ?token_hash=…&type=invite. Verifying
    // the hash signs the user in, then they choose their password. (Older
    // links carry the session in the #fragment instead — handled below.)
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && (type === "invite" || type === "recovery")) {
      setMode("verifying");
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        window.history.replaceState(null, "", "/reset-password");
        if (error) {
          setError("This link has expired or was already used. Enter your email to get a new one.");
          setMode("request");
        } else {
          setMode("set-password");
        }
      });
    } else if (ARRIVED_WITH_SET_PASSWORD_LINK) {
      setMode("set-password");
    }

    return () => subscription.unsubscribe();
  }, []);

  async function handleRequestLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMode("done");
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }
    // Vendors and admins work in their own dashboards, not the shopper account page.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role === "vendor") {
      window.location.href = VENDOR_URL;
    } else if (profile?.role === "admin") {
      window.location.href = ADMIN_URL;
    } else {
      router.replace("/account");
    }
  }

  if (mode === "verifying") {
    return (
      <AuthLayout logoSrc="/kmo-icon.png" title="Checking your link…" subtitle="One moment.">
        <span />
      </AuthLayout>
    );
  }

  if (mode === "done") {
    return (
      <AuthLayout
        logoSrc="/kmo-icon.png"
        title="Check your email"
        subtitle={`We sent a password reset link to ${email}. Follow it to set a new password.`}
      >
        <Link href="/login" className="text-sm font-semibold text-primary hover:text-primary-light">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  if (mode === "set-password") {
    return (
      <AuthLayout
        logoSrc="/kmo-icon.png"
        title="Set a new password"
        subtitle="Choose a password to finish activating your account."
      >
        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
          <PasswordInput
            label="New password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordInput
            label="Confirm password"
            name="confirm_password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Saving…" : "Save password"}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      logoSrc="/kmo-icon.png"
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-light">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleRequestLink} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
