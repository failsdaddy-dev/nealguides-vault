import "server-only";

// Login throttling (sliding window, in memory).
//
// Two keys per attempt: the client IP and the email address. Either one
// over its limit blocks the attempt, so one IP can't try many accounts and
// many IPs can't hammer one account. Successful sign-ins clear the email key.
//
// Limitation: memory is per server instance. On Vercel each instance keeps
// its own counts, so this slows attackers down rather than giving an exact
// global limit. Supabase Auth's own per-IP sign-in limit applies on top.
// A database-backed counter can replace this without changing callers.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface Limit {
  max: number;
  windowMs: number;
}

export const LOGIN_LIMITS = {
  ip: { max: 20, windowMs: 15 * 60_000 } satisfies Limit,
  email: { max: 5, windowMs: 15 * 60_000 } satisfies Limit,
};

function prune(key: string, limit: Limit, now: number): Bucket {
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < limit.windowMs);
  if (b.hits.length) buckets.set(key, b);
  else buckets.delete(key);
  return b;
}

/** Seconds until the key may try again, or 0 if it may try now. */
export function retryAfter(key: string, limit: Limit, now = Date.now()): number {
  const b = prune(key, limit, now);
  if (b.hits.length < limit.max) return 0;
  return Math.max(1, Math.ceil((b.hits[0]! + limit.windowMs - now) / 1000));
}

export function recordFailure(key: string, limit: Limit, now = Date.now()) {
  if (buckets.size > MAX_KEYS) buckets.clear(); // never grow without bound
  const b = prune(key, limit, now);
  b.hits.push(now);
  buckets.set(key, b);
}

export function clearKey(key: string) {
  buckets.delete(key);
}

/** First address in X-Forwarded-For (set by Vercel), else X-Real-IP. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "unknown";
}
