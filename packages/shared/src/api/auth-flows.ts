import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

interface SignUpWithCaptchaInput {
  email: string;
  password: string;
  data?: Record<string, unknown>;
  captchaToken: string;
  redirectTo?: string;
}

/** Sign up through the signup-with-captcha edge function (Turnstile checked server-side). */
export async function signUpWithCaptcha(supabase: Client, input: SignUpWithCaptchaInput) {
  const { data, error } = await supabase.functions.invoke<{
    user?: unknown;
    session?: unknown;
    error?: { message: string };
  }>("signup-with-captcha", { body: input });
  if (error) throw error;
  if (data?.error) throw new Error(data.error.message);
  return data;
}

/** Turns the current guest (anonymous) session into a real account and emails a set-password link. */
export async function claimGuestAccount(supabase: Client, email: string, redirectTo: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("claim-guest-account", {
    body: { email, redirectTo },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
