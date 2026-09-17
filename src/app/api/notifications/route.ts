import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)

  // Lightweight mode for the header badge poller: a single COUNT query
  // instead of shipping (and JSON-serializing) up to 50 rows every minute.
  if (searchParams.get('mode') === 'count') {
    const count = await db.notification.count({ where: { userId: session.id, read: false } })
    return NextResponse.json({ count })
  }

  const items = await db.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({
    notifications: items.map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, all } = await req.json()
  if (all) {
    await db.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } })
  } else if (id) {
    await db.notification.update({ where: { id }, data: { read: true } })
  }
  return NextResponse.json({ ok: true })
}
