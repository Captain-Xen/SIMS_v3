import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { db } from './db'

export const SESSION_COOKIE = 'edu_session'
export const SESSION_DAYS = 7

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  avatar: string | null
  bio: string | null
  phone: string | null
  grade: number | null
  className: string | null
  department: string | null
  subjects: string | null
  points: number
  level: number
  badges: number
}

// ---------------------------------------------------------------------------
// Password hashing — scrypt (node:crypto, zero dependencies).
// Stored format: scrypt$N$r$p$<salt hex>$<hash hex>
// Legacy plaintext passwords (from the old demo seed) are detected on login,
// verified timing-safely, and transparently upgraded to scrypt hashes.
// ---------------------------------------------------------------------------
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, key) => {
      if (err) return reject(err)
      resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${key.toString('hex')}`)
    })
  })
}

export function isHashedPassword(stored: string): boolean {
  return stored.startsWith('scrypt$')
}

/** Length-safe, timing-safe string comparison (compares SHA-256 digests). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** Verify a scrypt hash in constant time. */
export function verifyScrypt(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const [, n, r, p, saltHex, hashHex] = stored.split('$')
      if (!saltHex || !hashHex) return resolve(false)
      scrypt(password, Buffer.from(saltHex, 'hex'), Buffer.from(hashHex, 'hex').length, {
        N: Number(n) || SCRYPT_N,
        r: Number(r) || SCRYPT_R,
        p: Number(p) || SCRYPT_P,
      }, (err, key) => {
        if (err) return resolve(false)
        try {
          resolve(timingSafeEqual(key, Buffer.from(hashHex, 'hex')))
        } catch {
          resolve(false)
        }
      })
    } catch {
      resolve(false)
    }
  })
}

/**
 * Verify a login attempt against either a scrypt hash or a legacy plaintext
 * value. Returns whether the password matched and whether the stored value
 * should be upgraded (legacy plaintext) — the caller persists the new hash.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ ok: boolean; upgrade: boolean }> {
  if (isHashedPassword(stored)) {
    return { ok: await verifyScrypt(password, stored), upgrade: false }
  }
  // Legacy plaintext — compare safely, then flag for upgrade to scrypt.
  return { ok: safeEqual(password, stored), upgrade: true }
}

/** Dummy work to equalize response timing when an email doesn't exist. */
export async function fakePasswordWork(): Promise<void> {
  await hashPassword('timing-equalizer-' + randomBytes(4).toString('hex'))
}

// ---------------------------------------------------------------------------
// Sessions — server-side, revocable, token-based.
// The cookie carries a random 256-bit token; the DB row maps it to a user.
// A stolen/forged cookie value alone is useless (no userId enumeration), and
// logout deletes the row so the token truly dies.
// ---------------------------------------------------------------------------
const SESSION_TTL_MS = 30_000

interface CachedUser {
  user: Record<string, unknown>
  ts: number
}

const globalForSessions = globalThis as unknown as {
  __eduSessionCache: Map<string, CachedUser> | undefined
}

const sessionCache: Map<string, CachedUser> =
  globalForSessions.__eduSessionCache ?? new Map()
globalForSessions.__eduSessionCache = sessionCache

export function invalidateSessionCache(_userId?: string) {
  // Cache is keyed by session token; simply clear all (30s TTL bounds staleness).
  sessionCache.clear()
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
    secure: process.env.NODE_ENV === 'production',
  }
}

/** Create a DB-backed session for `userId` and return the cookie token. */
export async function createSession(userId: string, req?: NextRequest): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_DAYS),
      ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 64) ?? null,
      userAgent: req?.headers.get('user-agent')?.slice(0, 255) ?? null,
    },
  })
  return token
}

/** Attach the session cookie to a response. */
export function setSessionCookie(res: { cookies: { set: (o: object) => void } }, token: string) {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
}

/** Destroy the session row for a token (true revocation on logout). */
export async function destroySession(token: string): Promise<void> {
  try {
    await db.session.deleteMany({ where: { token } })
  } catch {
    // token may already be gone
  }
  sessionCache.delete(token)
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const now = Date.now()
  const cached = sessionCache.get(token)
  if (cached && now - cached.ts < SESSION_TTL_MS) {
    return toSessionUser(cached.user)
  }

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) {
    sessionCache.delete(token)
    return null
  }
  if (session.expiresAt.getTime() < now) {
    // Expired — clean up lazily.
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    sessionCache.delete(token)
    return null
  }

  sessionCache.set(token, { user: session.user, ts: now })
  return toSessionUser(session.user)
}

export function toSessionUser(user: any): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    phone: user.phone ?? null,
    grade: user.grade ?? null,
    className: user.className ?? null,
    department: user.department ?? null,
    subjects: user.subjects ?? null,
    points: user.points ?? 0,
    level: user.level ?? 1,
    badges: user.badges ?? 0,
  }
}
