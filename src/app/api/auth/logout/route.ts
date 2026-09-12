import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, invalidateSessionCache } from '@/lib/auth'

export async function POST() {
  // Clear the cached session row so a re-login sees fresh data immediately.
  const store = await cookies()
  const userId = store.get(SESSION_COOKIE)?.value
  if (userId) invalidateSessionCache(userId)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
