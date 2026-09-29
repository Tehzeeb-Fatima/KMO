"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";

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

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone,
          role: "customer",
        },
      },
    });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.replace("/");
    } else {
      // Email confirmation is required by the project's auth settings.
      setCheckEmail(true);
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? t.auth.creatingAccount : t.auth.signUpButton}
        </Button>
      </form>
    </AuthLayout>
  );
}
