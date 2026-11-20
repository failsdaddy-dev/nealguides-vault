// Runs before every page request (Next.js 16 "proxy", formerly middleware).
// 1. Refreshes the Supabase session cookie (getClaims verifies the JWT).
// 2. Sends signed-out visitors to /login. Pages still check access
//    themselves; this is only the fast first gate.
// Pattern: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH } from "@/lib/brand";
import { SUPABASE_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/no-access", "/robots.txt", "/brand", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  if (!SUPABASE_CONFIGURED) {
    // Fail closed: without Supabase settings a production build serves
    // nothing (RohTre opened a sample library here; we don't). In `next dev`
    // the sample library is allowed so the design can be checked.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Service not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // The landing page is public; signed-in people go straight to the library.
  if (path === "/") {
    if (!signedIn) return response;
    const url = request.nextUrl.clone();
    url.pathname = HOME_PATH;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  // Signed-in pages carry session cookies: never cache them in a shared cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
