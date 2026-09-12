import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SESSION_COOKIE, toSessionUser, verifyPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
  if (user.status !== 'Active') {
    return NextResponse.json({ error: `Account is ${user.status.toLowerCase()}. Contact administration.` }, { status: 403 })
  }
  const res = NextResponse.json({ user: toSessionUser(user) })
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
