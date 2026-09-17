import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { AuthLayout, Button, Input } from "@kmo/shared/ui";
import { useAuth } from "@kmo/shared/auth";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError(error.message);
  }

  return (
    <AuthLayout
      eyebrow="KMO Super Admin"
      title="Admin sign in"
      subtitle="Platform-wide vendor, order and catalog management."
      panelHeadline="Your marketplace, at a glance."
      panelBody="Approve vendors, moderate listings and keep every order across Karachi Mart Online running smoothly."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
