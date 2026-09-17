import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  toSessionUser, verifyPassword, hashPassword,
  createSession, setSessionCookie, destroySession,
  invalidateSessionCache, getSessionRaw, SESSION_COOKIE,
} from '@/lib/auth'
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit'

// Mandatory first-login password change for the real initial administrator
// (and any account flagged mustChangePassword=true).
//
// Security posture:
// - Reachable with a "pending" session (getSessionRaw) — this is the ONLY
//   data endpoint (besides me/logout) that a must-change session can hit.
//   Everything else is gated server-side by getSession() returning null.
// - Requires the current (temporary) password, verified timing-safely.
// - New password follows the app's existing rule: at least 8 characters
//   (same as registration), length-capped, and must differ from the current.
// - Stored as a scrypt hash — the temporary password never survives in
//   plaintext anywhere.
// - The session token is ROTATED after a successful change so any token that
//   leaked while the account was in its temporary state is instantly dead.
// - Rate limited to blunt automated guessing of the temporary password.

export async function POST(req: NextRequest) {
  const limit = rateLimit(`changepw:${clientIp(req)}`, 10, 5 * 60_000)
  if (!limit.ok) return tooMany(limit.retryAfter)

  const session = await getSessionRaw()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 })
  }
  if (currentPassword.length > 200 || newPassword.length > 200) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 400 })
  }

  // Existing application password requirement (same as registration): 8+ chars.
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'New password must be different from the current one.' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ok } = await verifyPassword(currentPassword, user.password)
  if (!ok) {
    return NextResponse.json({ error: 'The current password you entered is incorrect.' }, { status: 400 })
  }

  const hashed = await hashPassword(newPassword)
  const updated = await db.user.update({
    where: { id: user.id },
    data: { password: hashed, mustChangePassword: false },
  })

  // Rotate the session: kill the token used during the temporary state, issue
  // a fresh one so the client keeps a valid cookie with the flag now cleared.
  const store = await cookies()
  const oldToken = store.get(SESSION_COOKIE)?.value
  if (oldToken) await destroySession(oldToken)
  invalidateSessionCache()

  const token = await createSession(user.id, req)
  const res = NextResponse.json({ ok: true, user: toSessionUser(updated) })
  setSessionCookie(res, token)
  return res
}
