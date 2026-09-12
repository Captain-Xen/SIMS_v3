import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getCached, setCached, bustCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') // 'all' = all events, default = current month
  const cacheKey = `events:${range === 'all' ? 'all' : 'month'}`

  const cached = getCached<unknown>(cacheKey)
  if (cached) return NextResponse.json(cached)

  const where = range === 'all' ? {} : (() => {
    const yr = new Date().getFullYear()
    const mo = String(new Date().getMonth() + 1).padStart(2, '0')
    return { date: { startsWith: `${yr}-${mo}` } }
  })()
  const items = await db.calendarEvent.findMany({ where, orderBy: { date: 'asc' } })
  const payload = {
    events: items.map((e: any) => ({ id: e.id, title: e.title, date: e.date, type: e.type, description: e.description })),
  }
  setCached(cacheKey, payload, 10_000)
  return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, date, type, description } = await req.json()
  const e = await db.calendarEvent.create({ data: { title, date, type: type || 'Event', description, createdById: session.id } })
  bustCache('events:')
  return NextResponse.json({ ok: true, id: e.id })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.calendarEvent.delete({ where: { id } })
  bustCache('events:')
  return NextResponse.json({ ok: true })
}
