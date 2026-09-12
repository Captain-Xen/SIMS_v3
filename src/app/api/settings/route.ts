import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getCached, setCached, bustCache } from '@/lib/cache'

const CACHE_KEY = 'settings:singleton'

export async function GET() {
  // Fetched on every page load by every client — cache briefly.
  const cached = getCached<unknown>(CACHE_KEY)
  if (cached) return NextResponse.json({ settings: cached })

  const s = await db.schoolSettings.findUnique({ where: { id: 'singleton' } })
  if (s) setCached(CACHE_KEY, s, 30_000)
  return NextResponse.json({ settings: s })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'tagline', 'logo', 'accent', 'email', 'phone', 'address']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const s = await db.schoolSettings.upsert({ where: { id: 'singleton' }, update: data, create: { id: 'singleton', ...data } })
  bustCache('settings:')
  return NextResponse.json({ ok: true, settings: s })
}
