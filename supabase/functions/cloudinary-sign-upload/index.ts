// POST { kind: "video" | "audio" | "image" }  Admin only (active admin).
// Returns what the admin's browser needs to upload ONE preview file straight
// to Cloudinary (signed upload, no preset); the file never passes through
// this function. The server picks the folder, the public_id (random, inside
// the kind's folder) and the allowed formats, and signs them, so the browser
// cannot write anywhere else. Previews are public files ("upload" delivery
// type) with unguessable names; the real files stay on their own hosts.
// A signature can't cap size or length; the browser checks both and the
// database refuses anything over the limits (cards_*_ok checks).
// verified: https://cloudinary.com/documentation/authentication_signatures
// verified: https://cloudinary.com/documentation/image_upload_api_reference_upload (asset_folder, allowed_formats)
import { apiSignature, cloudinaryEnv, PREVIEW_KINDS, type PreviewKind } from "../_shared/cloudinary.ts";
import { corsHeaders, getCaller, isAdmin, json, originAllowed, readJson } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  if (!originAllowed(req)) return json(req, { error: "origin_not_allowed" }, 403);

  const caller = await getCaller(req);
  if (!caller) return json(req, { error: "not_signed_in" }, 401);
  if (!(await isAdmin(caller))) return json(req, { error: "admin_only" }, 403);

  const env = cloudinaryEnv();
  if (!env) return json(req, { error: "cloudinary_not_configured" }, 500);

  const b = await readJson(req);
  const kind = b?.kind as PreviewKind;
  const spec = Object.hasOwn(PREVIEW_KINDS, kind) ? PREVIEW_KINDS[kind] : null;
  if (!spec) return json(req, { error: "bad_request" }, 400);

  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    allowed_formats: spec.formats,
    asset_folder: spec.folder,
    public_id: `${spec.folder}/${crypto.randomUUID()}`,
    timestamp,
  };
  const signature = await apiSignature(params, env.secret);
  return json(req, {
    upload_url: `https://api.cloudinary.com/v1_1/${env.cloud}/${spec.resource}/upload`,
    api_key: env.apiKey,
    signature,
    max_mb: spec.maxMb,
    max_seconds: spec.maxSeconds,
    params,
  });
});
