import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, destroySession, invalidateSessionCache } from '@/lib/auth'

export async function POST(_req: NextRequest) {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    // Truly revoke: delete the DB row so the token can never be reused.
    await destroySession(token)
    invalidateSessionCache()
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
