import { NextResponse, type NextRequest } from "next/server";
import { clearKey, clientIp, LOGIN_LIMITS, recordFailure, retryAfter } from "@/lib/rate-limit";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

// POST { email, password } -> 200 { ok: true } | 400 | 401 | 429 | 503
//
// Sign-in runs on the server so attempts can be throttled before they reach
// Supabase. The Supabase server client writes the session cookies on this
// response (HttpOnly is not possible for Supabase SSR cookies because the
// browser client reads them; they are Secure in production and SameSite=Lax).
// One generic error for every failure: it never says whether the email exists.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC = "That email and password don’t match an active account.";

function noStore(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });
}

export async function POST(request: NextRequest) {
  if (!SUPABASE_CONFIGURED) return noStore({ error: "Sign-in isn’t configured yet." }, 503);

  // Same-origin only: a form on another site can't post here.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return noStore({ error: "Bad request." }, 403);

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  } catch {
    return noStore({ error: "Bad request." }, 400);
  }
  if (!EMAIL.test(email) || !password) return noStore({ error: GENERIC }, 401);

  const ipKey = `ip:${clientIp(request.headers)}`;
  const emailKey = `email:${email}`;
  const wait = Math.max(retryAfter(ipKey, LOGIN_LIMITS.ip), retryAfter(emailKey, LOGIN_LIMITS.email));
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return noStore(
      { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      429,
      { "Retry-After": String(wait) },
    );
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    recordFailure(ipKey, LOGIN_LIMITS.ip);
    recordFailure(emailKey, LOGIN_LIMITS.email);
    // Supabase's own rate limit answers 429 as well.
    if (error.status === 429) return noStore({ error: "Too many attempts. Try again in a few minutes." }, 429);
    return noStore({ error: GENERIC }, 401);
  }

  clearKey(emailKey);
  return noStore({ ok: true }, 200);
}
