// POST { email, password, display_name?, all_access?, filter_ids?, expires_at? }
// Admin only (active admin). Creates a confirmed login; the
// editor signs in with the password the admin sets here. Invite only:
// public sign-up is off, so this is the only way an account is made.
// all_access defaults to true (decision 14) unless the admin turns it off.
import {
  admin,
  audit,
  corsHeaders,
  getCaller,
  isAdmin,
  isUuid,
  json,
  originAllowed,
  passwordProblem,
  readJson,
} from "../_shared/common.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!originAllowed(req)) return json(req, { error: "origin_not_allowed" }, 403);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "not_signed_in" }, 401);
  if (!(await isAdmin(caller))) return json(req, { error: "admin_only" }, 403);

  const b = await readJson(req);
  const email = typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  const displayName = typeof b?.display_name === "string" ? b.display_name.trim().slice(0, 80) : "";
  const allAccess = b?.all_access !== false;
  const filterIds = Array.isArray(b?.filter_ids) ? b.filter_ids.filter(isUuid) : [];
  const expiresAt = typeof b?.expires_at === "string" && b.expires_at ? new Date(b.expires_at) : null;

  if (!EMAIL.test(email)) return json(req, { error: "Enter a valid email address." }, 400);
  const pwError = passwordProblem(password);
  if (pwError) return json(req, { error: pwError }, 400);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return json(req, { error: "The expiry date isn't valid." }, 400);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return json(req, { error: taken ? "A user with this email already exists." : "Couldn't create the user." }, 400);
  }
  const id = data.user.id;

  // The profile row is created by the on_auth_user_created trigger.
  const { error: pErr } = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      all_access: allAccess,
      expires_at: expiresAt?.toISOString() ?? null,
    })
    .eq("id", id);
  if (pErr) {
    await admin.auth.admin.deleteUser(id);
    return json(req, { error: "Couldn't save the user's profile." }, 500);
  }
  if (!allAccess && filterIds.length) {
    await admin.from("user_filter_access").insert(filterIds.map((filter_id: string) => ({ user_id: id, filter_id })));
  }

  await audit(caller, "admin_create_user", { user_id: id, email, all_access: allAccess, filters: filterIds.length });
  return json(req, { id });
});
