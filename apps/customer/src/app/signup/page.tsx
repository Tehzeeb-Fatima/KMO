"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout, Button, Input, PasswordInput } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();

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
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Follow it to finish creating your account.`}
      >
        <Link href="/login" className="text-sm font-semibold text-primary hover:text-primary-light">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      logoSrc="/kmo-icon.png"
      title="Create your account"
      subtitle="Join Karachi Mart to shop from local vendors across the city."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary-light">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          name="full_name"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone number"
          type="tel"
          name="phone"
          placeholder="+92 3XX XXXXXXX"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <PasswordInput
          label="Password"
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
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
