import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, toSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { name, email, password, role } = await req.json().catch(() => ({}))
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 })
  }
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }
  const isStudent = role === 'Student'
  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password,
      role: isStudent ? 'Student' : 'Teacher',
      status: 'Active',
      bio: isStudent ? 'Newly enrolled student.' : 'Newly joined teaching staff.',
      ...(isStudent ? { grade: 7, className: '7A' } : { department: 'General', subjects: '[]' }),
    },
  })
  await db.notification.create({ data: { userId: user.id, title: 'Welcome to EduCenterJM!', body: `Hello ${name}, your account is ready. Explore your dashboard to get started.`, type: 'success' } })
  const res = NextResponse.json({ user: toSessionUser(user) })
  res.cookies.set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
  return res
}
