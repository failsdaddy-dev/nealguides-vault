// Cloudinary settings for the Edge Functions. All three values are Supabase
// function secrets; the API secret never reaches the browser.
// Cloudinary holds PREVIEWS only (the real files stay on Google Drive, Mega,
// Dropbox, ...):
//   video  -> silent card clip, MP4/WebM/MOV, up to 10 s and 2 MB
//   audio  -> music preview, MP3, up to 30 s and 1 MB
//   image  -> still preview, JPG/PNG/WebP, up to 1 MB
// Clips and audio use Cloudinary's "video" resource type (audio is stored as
// video); stills use "image".
// verified: https://cloudinary.com/documentation/audio_transformations
export * from "./cloudinary-sign.ts";

export const PREVIEW_KINDS = {
  video: { folder: "nealguides-vault/previews", formats: "mp4,webm,mov", maxMb: 2, maxSeconds: 10, resource: "video" },
  audio: { folder: "nealguides-vault/music", formats: "mp3", maxMb: 1, maxSeconds: 30, resource: "video" },
  image: { folder: "nealguides-vault/images", formats: "jpg,jpeg,png,webp", maxMb: 1, maxSeconds: 0, resource: "image" },
} as const;
export type PreviewKind = keyof typeof PREVIEW_KINDS;

export function cloudinaryEnv(): { cloud: string; apiKey: string; secret: string } | null {
  const cloud = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
  const secret = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
  return cloud && apiKey && secret ? { cloud, apiKey, secret } : null;
}

/** The preview kind a public_id belongs to, or null if it is outside our folders. */
export function previewKindOf(v: unknown): PreviewKind | null {
  if (typeof v !== "string" || !/^[A-Za-z0-9_./-]+$/.test(v) || v.includes("..")) return null;
  for (const [kind, spec] of Object.entries(PREVIEW_KINDS)) {
    if (v.startsWith(`${spec.folder}/`)) return kind as PreviewKind;
  }
  return null;
}

export const isPreviewPublicId = (v: unknown): v is string => previewKindOf(v) !== null;
