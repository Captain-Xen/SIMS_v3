import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (per server instance).
// Deliberately dependency-free: for this single-node SQLite deployment the
// process memory IS the right store. If the app is ever horizontally scaled,
// swap the Map for Redis — the call sites stay identical.
//
// Buckets are swept lazily once a minute so memory stays flat even with
// abuse traffic.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number
  resetAt: number
}

const globalForLimiter = globalThis as unknown as {
  __eduRateBuckets: Map<string, Bucket> | undefined
}

const buckets: Map<string, Bucket> = globalForLimiter.__eduRateBuckets ?? new Map()
globalForLimiter.__eduRateBuckets = buckets

let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}

export interface RateResult {
  ok: boolean
  retryAfter: number // seconds until the window resets (when !ok)
}

/** Count one hit against `key`; allow up to `limit` hits per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  bucket.count++
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfter: 0 }
}

/** Best-effort client IP (works behind the gateway's X-Forwarded-For). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Build a 429 response with Retry-After — callers return this directly. */
export function tooMany(retryAfter: number, message = 'Too many attempts. Please try again shortly.') {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
  })
}
