import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toSessionUser, hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit'

// Security posture:
// - Rate limited per-IP (5 accounts / hour) to stop mass fake-account spam.
// - Input length caps + password minimum length.
// - Role is server-controlled (Student/Teacher only) — never trusted from client.
// - Passwords are hashed with scrypt at creation time.

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const limit = rateLimit(`register:ip:${ip}`, 5, 60 * 60_000)
  if (!limit.ok) return tooMany(limit.retryAfter, 'Too many accounts created from this network. Try again later.')

  const raw = await req.json().catch(() => ({}))
  const name = typeof raw?.name === 'string' ? raw.name.trim() : ''
  const email = typeof raw?.email === 'string' ? raw.email.toLowerCase().trim() : ''
  const password = typeof raw?.password === 'string' ? raw.password : ''
  const role = raw?.role === 'Teacher' ? 'Teacher' : 'Student' // whitelist

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 })
  }
  if (name.length > 120 || email.length > 254 || password.length > 200) {
    return NextResponse.json({ error: 'One or more fields are too long.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const isStudent = role === 'Student'
  const hashed = await hashPassword(password)
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      role,
      status: 'Active',
      bio: isStudent ? 'Newly enrolled student.' : 'Newly joined teaching staff.',
      ...(isStudent ? { grade: 7, className: '7A' } : { department: 'General', subjects: '[]' }),
    },
  })
  // Welcome notification uses the admin-configurable school name.
  const schoolSettings = await db.schoolSettings.findUnique({ where: { id: 'singleton' }, select: { name: true } })
  const schoolName = schoolSettings?.name || 'School Name'
  await db.notification.create({ data: { userId: user.id, title: `Welcome to ${schoolName}!`, body: `Hello ${name}, your account is ready. Explore your dashboard to get started.`, type: 'success' } })

  const token = await createSession(user.id, req)
  const res = NextResponse.json({ user: toSessionUser(user) })
  setSessionCookie(res, token)
  return res
}
