"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";

type Mode = "request" | "set-password" | "done";

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
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/account");
  }

  if (mode === "done") {
    return (
      <AuthLayout
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
      <AuthLayout title="Set a new password" subtitle="Choose a password to finish activating your account.">
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
