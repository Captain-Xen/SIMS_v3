import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  toSessionUser, verifyPassword, hashPassword,
  fakePasswordWork, createSession, setSessionCookie,
} from '@/lib/auth'
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit'

// Security posture:
// - Rate limited per-IP and per-IP+account (sliding window) to blunt brute force.
// - Generic error message + timing-equalized miss path (no user enumeration).
// - Legacy plaintext passwords are verified timing-safely and transparently
//   upgraded to scrypt hashes on first successful login.
// - Sessions are random 256-bit DB-backed tokens in an httpOnly cookie
//   (Secure in production) — never the user id itself.

export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  // Global per-IP ceiling for this endpoint (30 attempts / 5 min).
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, 5 * 60_000)
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfter)

  const body = await req.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  // Input caps: keeps scrypt cost bounded and DB queries sane.
  if (email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 })
  }

  // Per-account ceiling (8 tries / 5 min per IP+email pair).
  const acctLimit = rateLimit(`login:acct:${ip}:${email}`, 8, 5 * 60_000)
  if (!acctLimit.ok) return tooMany(acctLimit.retryAfter, 'Too many sign-in attempts for this account. Try again in a few minutes.')

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    await fakePasswordWork() // equalize timing so misses don't reveal valid emails
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const { ok, upgrade } = await verifyPassword(password, user.password)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
  if (user.status !== 'Active') {
    return NextResponse.json({ error: `Account is ${user.status.toLowerCase()}. Contact administration.` }, { status: 403 })
  }

  if (upgrade) {
    // Transparent migration: legacy plaintext -> scrypt hash.
    const hashed = await hashPassword(password)
    await db.user.update({ where: { id: user.id }, data: { password: hashed } }).catch(() => {})
  }

  // Prune expired sessions for this user occasionally (cheap + keeps DB tidy).
  await db.session.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  }).catch(() => {})

  const token = await createSession(user.id, req)
  const res = NextResponse.json({ user: toSessionUser(user) })
  setSessionCookie(res, token)
  return res
}
