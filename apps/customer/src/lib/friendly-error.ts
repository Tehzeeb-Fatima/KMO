/** Turns technical errors (Supabase auth, edge functions, network) into a
 * message a shopper can act on. Messages we wrote for shoppers pass through. */
const RULES: [RegExp, string][] = [
  [/failed to fetch|network|load failed|fetch failed/i, "No internet connection. Please check your internet and try again."],
  [/invalid login credentials/i, "Email or password is incorrect. Please try again, or use Forgot password."],
  [/email not confirmed/i, "Please confirm your email first. Check your inbox (and Spam folder) for our email."],
  [/user already registered|already been registered|already registered/i, "This email already has an account. Please sign in instead."],
  [/password should be at least (\d+)/i, "Password must be at least $1 characters."],
  [/new password should be different/i, "Please choose a new password that is different from your old one."],
  [/weak password|password is too weak|pwned/i, "This password is too easy to guess. Please choose a stronger one."],
  [/only request this after (\d+) seconds/i, "Please wait $1 seconds and try again."],
  [/rate limit|too many requests/i, "Too many tries. Please wait a few minutes and try again."],
  [/unable to validate email|invalid email|valid email/i, "Please check your email address, e.g. name@gmail.com"],
  [/(link|token).*(expired|invalid)|otp_expired/i, "This link has expired. Please request a new one."],
  [/captcha/i, "Security check failed. Please refresh the page and try again."],
  [/not authenticated|authorization|jwt|session|sign in again/i, "Your session has expired. Please refresh the page and try again."],
  [/cart is empty/i, "Your cart is empty. Please add a product first."],
  [/address not found/i, "Please choose your delivery address again."],
  [/edge function|non-2xx|invalid json|required|method not allowed|failed to create order|violates|duplicate key|null value|column|relation|syntax/i,
    "Something went wrong on our side. Please try again, or contact us on WhatsApp."],
];

export function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!message) return "Something went wrong. Please try again.";
  for (const [pattern, friendly] of RULES) {
    const m = message.match(pattern);
    if (m) return friendly.replace("$1", m[1] ?? "");
  }
  return message;
}
