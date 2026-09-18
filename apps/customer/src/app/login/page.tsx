"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput, PillTabs } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

type Mode = "email" | "phone";
type PhoneStep = "enter-phone" | "enter-code";

/** Everything lives under one domain — send each role to its own area after sign-in. */
function pathForRole(role: string | undefined) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

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
    const target = pathForRole(profile?.role);
    if (target === "/") {
      router.replace("/");
    } else {
      window.location.href = target;
    }
    return null;
  }

  /** Vendor/admin dashboards are proxied at /vendor and /admin — a plain
   * navigation (not the Next.js router) is needed to actually load them. */
  async function redirectAfterSignIn(userId: string) {
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    const target = pathForRole(data?.role);
    if (target === "/") {
      router.replace("/");
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
      title="Welcome back"
      subtitle="Sign in to track orders, manage your wishlist, and check out faster."
      panelHeadline="Pakistan's local marketplace, online."
      panelBody="Shop from thousands of vendors across Karachi — electronics, fashion, groceries and more, delivered to your door."
      footer={
        <>
          New to Karachi Mart?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:text-primary-light">
            Create an account
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
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
        ]}
        className="mb-6 w-full [&>button]:flex-1 [&>button]:text-center"
      />

      {mode === "email" ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <PasswordInput
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-1.5 text-right">
              <Link href="/reset-password" className="text-xs font-medium text-primary hover:text-primary-light">
                Forgot password?
              </Link>
            </div>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : phoneStep === "enter-phone" ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-4">
          <Input
            label="Phone number"
            type="tel"
            name="phone"
            placeholder="+92 3XX XXXXXXX"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Sending code…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Enter the code we sent to <span className="font-semibold text-ink">{phone}</span>.
          </p>
          <Input
            label="Verification code"
            inputMode="numeric"
            name="otp"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting ? "Verifying…" : "Verify & sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setPhoneStep("enter-phone")}
            className="text-sm font-medium text-primary hover:text-primary-light"
          >
            Use a different number
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
