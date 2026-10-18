/** supabase-js reports any non-2xx edge function reply as the generic
 * "Edge Function returned a non-2xx status code". The function's own
 * `{ error }` body says what actually went wrong, so surface that instead. */
export async function functionError(error: unknown): Promise<Error> {
  const fallback = error instanceof Error ? error : new Error(String(error));
  const res = (error as { context?: Response } | null)?.context;
  if (!res || typeof res.json !== "function") return fallback;
  try {
    const body = (await res.json()) as { error?: string | { message?: string } };
    const message = typeof body?.error === "string" ? body.error : body?.error?.message;
    if (message) return new Error(message);
  } catch {
    // body wasn't JSON — keep the generic message
  }
  return fallback;
}
