import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

// POST only, so a link or image on another site can't sign someone out.
// signOut() defaults to scope "global": every session of this user (every
// browser and device) loses its refresh token. The ?signed_out=1 flag tells
// the login page to broadcast the sign-out to this browser's other tabs.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Bad request.", { status: 403 });
  }
  if (SUPABASE_CONFIGURED) {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  }
  const res = NextResponse.redirect(new URL("/login?signed_out=1", request.url), { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  // Belt and braces: ask the browser to drop cached pages and storage for this site.
  res.headers.set("Clear-Site-Data", '"cache", "storage"');
  return res;
}
