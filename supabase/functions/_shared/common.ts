// Shared helpers for Neal Guides Vault Edge Functions (Deno).
// The secret key comes from the Supabase runtime and never leaves the server.
// verified: https://supabase.com/docs/guides/api/api-keys (SUPABASE_SECRET_KEYS)
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const keys = JSON.parse(raw) as Record<string, string>;
      const key = keys["default"] ?? Object.values(keys)[0];
      if (key) return key;
    } catch {
      /* fall through */
    }
  }
  // Local CLI fallback names.
  return Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Browsers may only call these functions from the app's own origins, set as
// the ALLOWED_ORIGINS function secret (comma separated). Fail closed: when it
// is unset, no browser origin is allowed (RohTre fell back to localhost).
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (ALLOWED.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/** Requests that carry an Origin header must come from an allowed origin.
 *  (Server-side check on top of CORS, which only the browser enforces.) */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  return origin === null || ALLOWED.includes(origin);
}

/** Same password rule as supabase/config.toml: 12+ characters with lower
 *  case, upper case and a digit. Returns an error message or null. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "The password needs at least 12 characters.";
  if (password.length > 72) return "The password can have at most 72 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "The password needs a lower-case letter, an upper-case letter and a digit.";
  }
  return null;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export interface Caller {
  id: string;
  email: string;
}

/** Verifies the caller's access token (signature + expiry) and returns who they are. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getClaims(token);
  const claims = data?.claims;
  if (error || !claims?.sub || claims.role !== "authenticated") return null;
  return { id: claims.sub, email: String(claims.email ?? "") };
}

/** Same rule as private.is_admin(): an active, unexpired admin profile. */
export async function isAdmin(caller: Caller): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("role, is_active, expires_at")
    .eq("id", caller.id)
    .maybeSingle();
  if (!data || data.role !== "admin" || !data.is_active) return false;
  return !(data.expires_at && new Date(data.expires_at) <= new Date());
}

export async function audit(caller: Caller, action: string, details: Record<string, unknown>) {
  await admin.from("audit_log").insert({ actor_id: caller.id, actor_email: caller.email, action, details });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ menu access
// Restricted editors (all_access off) see only the side-menu items the admin
// ticks: whole groups, whole sections, or single subsections.
export interface MenuAccess {
  group_ids: string[];
  section_ids: string[];
  subsection_ids: string[];
}
const MAX_MENU_ITEMS = 500;

/** Reads `menu` from a request body; unknown values are dropped. */
export function readMenu(v: unknown): MenuAccess {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const ids = (x: unknown) => [...new Set(Array.isArray(x) ? x.filter(isUuid) : [])].slice(0, MAX_MENU_ITEMS);
  return { group_ids: ids(o.group_ids), section_ids: ids(o.section_ids), subsection_ids: ids(o.subsection_ids) };
}
export const menuSize = (m: MenuAccess) => m.group_ids.length + m.section_ids.length + m.subsection_ids.length;

/** Replaces the user's menu access. Returns an error message or null. */
export async function saveMenu(userId: string, m: MenuAccess): Promise<string | null> {
  const { error: delErr } = await admin.from("user_menu_access").delete().eq("user_id", userId);
  if (delErr) return "Couldn't save the access list.";
  const rows = [
    ...m.group_ids.map((group_id) => ({ user_id: userId, group_id })),
    ...m.section_ids.map((section_id) => ({ user_id: userId, section_id })),
    ...m.subsection_ids.map((subsection_id) => ({ user_id: userId, subsection_id })),
  ];
  if (!rows.length) return null;
  const { error } = await admin.from("user_menu_access").insert(rows);
  // A foreign-key error means an item was deleted meanwhile.
  return error ? "Couldn't save the access list. Reload and try again." : null;
}
