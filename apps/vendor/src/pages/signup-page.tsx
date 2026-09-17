import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthLayout, Button, Input, PasswordInput } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function SignupPage() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role: "vendor",
          pending_vendor: true,
          store_name: storeName,
          area: storeLocation,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthLayout
        eyebrow="KMO Vendor Portal"
        title="Application received"
        subtitle={`We've sent a confirmation link to ${email}. Once confirmed, our team will review your store and email you when it's approved.`}
      >
        <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-light">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="KMO Vendor Portal"
      title="Start selling on Karachi Mart"
      subtitle="Set up your store — home-based or shopfront, we review every application before it goes live."
      footer={
        <>
          Already have a store account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-light">
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
          label="Store name"
          name="store_name"
          placeholder="e.g. Tariq Road Electronics"
          required
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
        <Input
          label="Store location"
          name="store_location"
          placeholder="e.g. Tariq Road, Karachi"
          required
          value={storeLocation}
          onChange={(e) => setStoreLocation(e.target.value)}
        />
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
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </AuthLayout>
  );
}
