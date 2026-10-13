// Supabase Edge Function: bookkeeping-auth
//
// Email second factor for the super-admin Bookkeeping module.
//   { action: "send" }                      -> emails a different 6-digit code
//                                              to each person in bk_people
//   { action: "verify", requestId, code }   -> on a match, opens a 12-hour
//                                              unlock session for that person
//
// Rules: codes expire after 10 minutes, a request locks after 5 wrong codes,
// at most one request per minute and six per hour. Codes and session tokens
// are stored only as SHA-256 hashes.
//
// Mail goes out through SMTP. Settings come from secrets so the sender can be
// changed without touching code:
//   KMO_SMTP_PASSWORD (required), KMO_SMTP_USER (default info@karachimartonline.com),
//   KMO_SMTP_HOST (default smtp.hostinger.com), KMO_SMTP_PORT (default 465).
//
// Deploy with: pnpm dlx supabase functions deploy bookkeeping-auth

import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const SESSION_HOURS = 12;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function sixDigits(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function karachiTime(d: Date): string {
  return d.toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });
}

function mailer() {
  const user = Deno.env.get("KMO_SMTP_USER") ?? "info@karachimartonline.com";
  const port = Number(Deno.env.get("KMO_SMTP_PORT") ?? "465");
  const transport = nodemailer.createTransport({
    host: Deno.env.get("KMO_SMTP_HOST") ?? "smtp.hostinger.com",
    port,
    secure: port === 465,
    // trim: a pasted secret easily picks up a stray space or newline
    auth: { user, pass: (Deno.env.get("KMO_SMTP_PASSWORD") ?? "").trim() },
  });
  return { transport, from: `"Karachi Mart Online" <${user}>` };
}

function emailHtml(heading: string, body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2b1d33">
  <p style="font-size:12px;letter-spacing:2px;color:#c4552d;margin:0">KARACHI MART ONLINE · BOOKKEEPING</p>
  <h2 style="margin:12px 0 16px;font-size:20px">${heading}</h2>${body}
  <p style="font-size:12px;color:#8a749e;margin-top:24px">This is an automatic security email. Do not share this code with anyone.</p></div>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Please sign in again." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: "Please sign in again." }, 401);
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: superAdmin } = await admin.from("bk_super_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!superAdmin) return json({ error: "Not available." }, 403);

  let body: { action?: string; requestId?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const { data: people } = await admin.from("bk_people").select("key, name, email");
  if (!people?.length) return json({ error: "No one is set up to receive codes." }, 500);

  if (body.action === "send") {
    const now = Date.now();
    const { data: recent } = await admin
      .from("bk_code_requests")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });
    if (recent?.length && now - new Date(recent[0].created_at).getTime() < 60 * 1000) {
      return json({ error: "Please wait a minute before asking for new codes." }, 429);
    }
    if ((recent?.length ?? 0) >= 6) {
      return json({ error: "Too many code requests. Try again in an hour." }, 429);
    }

    const { data: request, error: reqError } = await admin
      .from("bk_code_requests")
      .insert({ user_id: userId, expires_at: new Date(now + CODE_TTL_MIN * 60 * 1000).toISOString() })
      .select("id, expires_at")
      .single();
    if (reqError || !request) return json({ error: "Could not create codes." }, 500);

    const codes = people.map((p) => ({ person: p, code: sixDigits() }));
    await admin.from("bk_codes").insert(
      await Promise.all(
        codes.map(async ({ person, code }) => ({
          request_id: request.id,
          person_key: person.key,
          code_hash: await sha256(`${request.id}:${code}`),
        })),
      ),
    );

    const { transport, from } = mailer();
    const when = karachiTime(new Date(now));
    const results = await Promise.allSettled(
      codes.map(({ person, code }) =>
        transport.sendMail({
          from,
          to: person.email,
          subject: "KMO Bookkeeping verification code",
          text: `Hi ${person.name},\n\nYour code to open KMO Bookkeeping is: ${code}\nIt expires in ${CODE_TTL_MIN} minutes.\n\nRequested on ${when} (Karachi time). If neither you nor your partner asked for this, change the super admin password.`,
          html: emailHtml(
            `Hi ${person.name}, your code`,
            `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:0 0 16px">${code}</p>
             <p style="margin:0 0 8px">Use it to open KMO Bookkeeping. It expires in ${CODE_TTL_MIN} minutes.</p>
             <p style="margin:0;font-size:13px;color:#5c4a6b">Requested on ${when} (Karachi time). If neither you nor your partner asked for this, change the super admin password.</p>`,
          ),
        }),
      ),
    );
    const sent = codes.filter((_, i) => results[i].status === "fulfilled").map(({ person }) => person.name);
    if (!sent.length) {
      await admin.from("bk_code_requests").delete().eq("id", request.id);
      const reason = results[0].status === "rejected" ? String(results[0].reason?.message ?? results[0].reason) : "";
      console.error("bookkeeping-auth: email failed", reason);
      return json({ error: "Could not send the code emails. Check the email settings." }, 502);
    }
    await admin.from("bk_activity").insert({ action: "codes sent", details: { sent_to: sent } });
    return json({ requestId: request.id, expiresAt: request.expires_at, sentTo: sent });
  }

  if (body.action === "verify") {
    const requestId = body.requestId ?? "";
    const code = (body.code ?? "").replace(/\D/g, "");
    if (!requestId || code.length !== 6) return json({ error: "Enter the 6-digit code." }, 400);

    const { data: request } = await admin
      .from("bk_code_requests")
      .select("id, expires_at, attempts, used_at")
      .eq("id", requestId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!request || request.used_at) return json({ error: "These codes are no longer valid. Send new codes." }, 400);
    if (new Date(request.expires_at).getTime() < Date.now()) {
      return json({ error: "The code has expired. Send new codes." }, 400);
    }
    if (request.attempts >= MAX_ATTEMPTS) {
      return json({ error: "Too many wrong codes. Send new codes." }, 429);
    }

    const hash = await sha256(`${requestId}:${code}`);
    const { data: match } = await admin
      .from("bk_codes")
      .select("person_key")
      .eq("request_id", requestId)
      .eq("code_hash", hash)
      .maybeSingle();
    if (!match) {
      const attempts = request.attempts + 1;
      await admin.from("bk_code_requests").update({ attempts }).eq("id", requestId);
      await admin.from("bk_activity").insert({ action: "wrong code", details: { attempt: attempts } });
      const left = MAX_ATTEMPTS - attempts;
      return json(
        { error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Send new codes." },
        400,
      );
    }

    await admin.from("bk_code_requests").update({ used_at: new Date().toISOString() }).eq("id", requestId);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
    await admin.from("bk_sessions").insert({
      token_hash: await sha256(token),
      user_id: userId,
      person_key: match.person_key,
      expires_at: expiresAt,
    });
    await admin.from("bk_activity").insert({ person_key: match.person_key, action: "unlocked" });

    // Let the other partner know someone opened the books.
    const opener = people.find((p) => p.key === match.person_key)!;
    const others = people.filter((p) => p.key !== match.person_key);
    const { transport, from } = mailer();
    const when = karachiTime(new Date());
    await Promise.allSettled(
      others.map((p) =>
        transport.sendMail({
          from,
          to: p.email,
          subject: `${opener.name} opened KMO Bookkeeping`,
          text: `Hi ${p.name},\n\n${opener.name} opened KMO Bookkeeping on ${when} (Karachi time). No action is needed if you expected this.`,
          html: emailHtml(
            `${opener.name} opened Bookkeeping`,
            `<p style="margin:0">${opener.name} opened KMO Bookkeeping on ${when} (Karachi time). No action is needed if you expected this.</p>`,
          ),
        }),
      ),
    );

    return json({ token, person: match.person_key, personName: opener.name, expiresAt });
  }

  return json({ error: "Unknown action." }, 400);
});
