import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, toSessionUser, invalidateSessionCache } from '@/lib/auth'

// GET current user (full profile)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ user: session })
}

// PATCH own profile (name, bio, phone, avatar)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'bio', 'phone', 'avatar']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const user = await db.user.update({ where: { id: session.id }, data })
  invalidateSessionCache(session.id)
  return NextResponse.json({ user: toSessionUser(user) })
}
