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
  accountType: 'real' | 'demo'
  mustChangePassword: boolean
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
// Initial (real) administrator — first-time setup.
// A dedicated real admin account (separate from the demo accounts) is created
// with a cryptographically random temporary password. The password is printed
// to the server console ONCE during setup; only its scrypt hash is stored.
// The account carries mustChangePassword=true, which the whole API surface
// enforces (see getSession below) until the admin sets a permanent password.
// ---------------------------------------------------------------------------
export const INITIAL_ADMIN_EMAIL = (process.env.INITIAL_ADMIN_EMAIL || 'administrator@sims.local').toLowerCase()

/** Cryptographically random, human-typeable temp password: xxxx-xxxx-xxxx-xxxx. */
export function generateTempPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789' // no lookalikes
  const bytes = randomBytes(16)
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length])
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

/**
 * Idempotently ensure the real initial administrator exists. Never creates a
 * second one, never touches demo accounts, and never logs/returns the temp
 * password except once at creation time (returned to the setup caller only).
 */
export async function ensureInitialAdmin(): Promise<{ created: boolean; email: string; tempPassword?: string }> {
  const email = INITIAL_ADMIN_EMAIL
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return { created: false, email }

  const tempPassword = process.env.INITIAL_ADMIN_PASSWORD || generateTempPassword()
  const hashed = await hashPassword(tempPassword)
  await db.user.create({
    data: {
      email,
      name: 'System Administrator',
      password: hashed,
      role: 'Admin',
      status: 'Active',
      accountType: 'real',
      mustChangePassword: true,
      department: 'Administration',
      bio: 'Initial administrator account created during first-time setup.',
    },
  })
  return { created: true, email, tempPassword }
}

/** One-time console banner for the setup log. Called only when the account was just created. */
export function printInitialAdminCredentials(email: string, tempPassword: string): void {
  const line = '-'.repeat(74)
  console.log(
    `\n${line}\n  INITIAL ADMINISTRATOR ACCOUNT CREATED (first-time setup)\n\n` +
    `  Email:             ${email}\n` +
    `  Temporary password: ${tempPassword}\n\n` +
    `  Sign in with these credentials; you will be REQUIRED to set a permanent\n` +
    `  password before the dashboard unlocks. This temporary password is shown\n` +
    `  here only once and is stored in the database solely as a scrypt hash.\n${line}\n`,
  )
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

/**
 * Raw session lookup — used only by the few endpoints that must stay reachable
 * while a mandatory password change is pending: /api/auth/me, /api/auth/logout
 * and /api/auth/change-password itself. Every other endpoint uses getSession().
 */
export async function getSessionRaw(): Promise<SessionUser | null> {
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

/**
 * Backend-enforced gate: resolves the session like getSessionRaw, but returns
 * null (=> 401 on every protected route) while mustChangePassword is true.
 * This is what makes the mandatory "Change Your Password" step impossible to
 * bypass by typing protected URLs — data simply does not flow until the flag
 * is cleared server-side. Demo accounts (mustChangePassword=false) are never
 * affected.
 */
export async function getSession(): Promise<SessionUser | null> {
  const user = await getSessionRaw()
  if (!user) return null
  if (user.mustChangePassword) return null
  return user
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
    accountType: user.accountType === 'demo' ? 'demo' : 'real',
    mustChangePassword: !!user.mustChangePassword,
  }
}
