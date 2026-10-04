"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput, Turnstile } from "@kmo/shared/ui";
import { signUpWithCaptcha } from "@kmo/shared/api";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  if (user && !user.is_anonymous) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDontMatch);
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setSubmitting(true);
    let data: Awaited<ReturnType<typeof signUpWithCaptcha>>;
    try {
      data = await signUpWithCaptcha(supabase, {
        email,
        password,
        captchaToken,
        redirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone,
          role: "customer",
        },
      });
    } catch (err) {
      setSubmitting(false);
      setCaptchaResetKey((k) => k + 1);
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
      return;
    }
    setSubmitting(false);
    setCaptchaResetKey((k) => k + 1);

    if (data?.session) {
      router.replace("/");
    } else {
      // Email confirmation is required by the project's auth settings. Send the
      // customer to the homepage; a banner there asks them to verify the email.
      try {
        sessionStorage.setItem("kmo_verify_email", email);
      } catch {
        // storage blocked: the homepage just won't show the banner
      }
      router.replace("/");
    }
  }

  if (checkEmail) {
    return (
      <AuthLayout
        logoSrc="/kmo-icon.png"
        title={t.auth.checkEmailTitle}
        subtitle={t.auth.checkEmailSubtitle.replace("{email}", email)}
      >
        <Link href="/login" className="text-sm font-semibold text-primary hover:text-primary-light">
          {t.auth.backToSignIn}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      logoSrc="/kmo-icon.png"
      title={t.auth.signUpTitle}
      subtitle={t.auth.signUpSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-light">
            {t.auth.signInLink}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t.auth.fullName}
          name="full_name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label={t.auth.email}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t.auth.phone}
          type="tel"
          name="phone"
          placeholder={t.auth.phonePlaceholder}
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <PasswordInput
          label={t.auth.password}
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          label={t.auth.confirmPassword}
          name="confirm_password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetKey={captchaResetKey} />
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? t.auth.creatingAccount : t.auth.signUpButton}
        </Button>
      </form>
    </AuthLayout>
  );
}
