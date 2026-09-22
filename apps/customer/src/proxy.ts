import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that must always work, even while the site is in maintenance mode —
// the admin needs /login to sign in and unlock the rest of the site, and
// /maintenance itself must never redirect to itself.
const ALWAYS_ALLOWED = ["/maintenance", "/login", "/offline"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const cookieDomain = request.nextUrl.hostname.endsWith("karachimartonline.com")
    ? ".karachimartonline.com"
    : undefined;

  try {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, { ...options, domain: cookieDomain });
          }
        },
      },
    });

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("maintenance_mode")
      .eq("id", true)
      .maybeSingle();

    if (!settings?.maintenance_mode) {
      return response;
    }

    // Maintenance is on — let the super admin through, everyone else gets
    // redirected to the maintenance page.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "admin") {
        return response;
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  } catch {
    // If Supabase is unreachable, fail open rather than taking the whole site down.
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
