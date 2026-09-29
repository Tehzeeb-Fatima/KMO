"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput, PillTabs } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

type Mode = "email" | "phone";
type PhoneStep = "enter-phone" | "enter-code";

const VENDOR_URL = process.env.NEXT_PUBLIC_VENDOR_URL ?? "https://vendor.karachimartonline.com";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.karachimartonline.com";

/** Vendor/admin live on their own subdomains — send each role to its own area
 *  after sign-in. Customers go to `next` when given (e.g. back to the store
 *  page they were trying to follow), falling back to the homepage — only
 *  ever a same-site path, never an absolute URL from the query string. */
function pathForRole(role: string | undefined, next: string | null) {
  if (role === "admin") return ADMIN_URL;
  if (role === "vendor") return VENDOR_URL;
  return next && next.startsWith("/") ? next : "/";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<Mode>("email");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // phone OTP
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  if (user && !user.is_anonymous) {
    const target = pathForRole(profile?.role, next);
    if (target.startsWith("/")) {
      router.replace(target);
    } else {
      window.location.href = target;
    }
    return null;
  }

  /** Vendor/admin dashboards live on their own subdomains — a plain
   * navigation (not the Next.js router) is needed to actually load them. */
  async function redirectAfterSignIn(userId: string) {
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    const target = pathForRole(data?.role, next);
    if (target.startsWith("/")) {
      router.replace(target);
    } else {
      window.location.href = target;
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    await redirectAfterSignIn(data.user.id);
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPhoneStep("enter-code");
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user) await redirectAfterSignIn(data.user.id);
    else router.replace("/");
  }

  return (
    <AuthLayout
      logoSrc="/kmo-icon.png"
      title={t.auth.welcomeBack}
      subtitle={t.auth.signInSubtitle}
      panelHeadline={t.auth.panelHeadline}
      panelBody={t.auth.panelBody}
      footer={
        <>
          {t.auth.newToKmo}{" "}
          <Link href="/signup" className="font-semibold text-primary hover:text-primary-light">
            {t.auth.createAccount}
          </Link>
        </>
      }
    >
      <PillTabs
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: "email", label: t.auth.emailTab },
          { value: "phone", label: t.auth.phoneTab },
        ]}
        className="mb-6 w-full [&>button]:flex-1 [&>button]:text-center"
      />

      {mode === "email" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <Input
            label={t.auth.email}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <PasswordInput
              label={t.auth.password}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-1.5 text-right">
              <Link href="/reset-password" className="text-xs font-medium text-primary hover:text-primary-light">
                {t.auth.forgotPassword}
              </Link>
            </div>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? t.auth.signingIn : t.auth.signInButton}
          </Button>
        </form>
      ) : phoneStep === "enter-phone" ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-4">
          <Input
            label={t.auth.phone}
            type="tel"
            name="phone"
            placeholder={t.auth.phonePlaceholder}
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? t.auth.sendingCode : t.auth.sendCode}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {t.auth.enterCodeSentTo} <span className="font-semibold text-ink">{phone}</span>.
          </p>
          <Input
            label={t.auth.verificationCode}
            inputMode="numeric"
            name="otp"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? t.auth.verifying : t.auth.verifyAndSignIn}
          </Button>
          <button
            type="button"
            onClick={() => setPhoneStep("enter-phone")}
            className="text-sm font-medium text-primary hover:text-primary-light"
          >
            {t.auth.useDifferentNumber}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
