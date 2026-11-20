import type { NextConfig } from "next";

// Content Security Policy (production only; `next dev` needs eval for hot reload).
// Allows only this app, Supabase, the Loom embed (no other third-party
// scripts), and Cloudinary for preview files: admin uploads go to
// api.cloudinary.com; clips, stills and music previews come from
// res.cloudinary.com. Inline scripts are still needed by Next.js without
// nonces (nonce-based CSP is on the Later list).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^https:/, "wss:");
const CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' + worker-src: the admin's in-browser video tool (ffmpeg.wasm, served from /ffmpeg).
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://res.cloudinary.com",
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://api.cloudinary.com`.trim(),
  "frame-src https://www.loom.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Internal tool: never indexed, never framed by other sites.
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd
            ? [
                { key: "Content-Security-Policy", value: CSP },
                // HTTPS only for two years, subdomains included.
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
