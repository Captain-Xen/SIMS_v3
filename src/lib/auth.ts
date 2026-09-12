import { cookies } from 'next/headers'
import { db } from './db'

export const SESSION_COOKIE = 'edu_session'

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
// Session cache: getSession() previously hit the database on EVERY API request
// (~45 routes + 2 client pollers). Sessions change rarely, so we keep a short
// 30s in-memory cache keyed by user id. Mutations that touch user rows call
// invalidateSessionCache() to stay correct.
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

export function invalidateSessionCache(userId?: string) {
  if (userId) sessionCache.delete(userId)
  else sessionCache.clear()
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const userId = store.get(SESSION_COOKIE)?.value
  if (!userId) return null

  const now = Date.now()
  const cached = sessionCache.get(userId)
  if (cached && now - cached.ts < SESSION_TTL_MS) {
    return toSessionUser(cached.user)
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    sessionCache.delete(userId)
    return null
  }
  sessionCache.set(userId, { user, ts: now })
  return toSessionUser(user)
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

// Simple constant-time-ish comparison (passwords are demo plaintext — NOT for production)
export function verifyPassword(input: string, stored: string): boolean {
  return input === stored
}
