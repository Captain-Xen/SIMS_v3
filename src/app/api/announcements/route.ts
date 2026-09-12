import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getCached, setCached, bustCache } from '@/lib/cache'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Same payload for every signed-in user — serve from a short TTL cache.
  const cached = getCached<{ announcements: unknown[] }>('announcements:all')
  if (cached) return NextResponse.json(cached)

  const items = await db.announcement.findMany({ orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true, role: true } } } })
  const payload = {
    announcements: items.map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      authorName: a.author?.name ?? 'System',
      authorRole: a.author?.role ?? '',
      createdAt: a.createdAt.toISOString(),
    })),
  }
  setCached('announcements:all', payload, 10_000)
  return NextResponse.json(payload)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, body } = await req.json()
  const a = await db.announcement.create({ data: { title, body, authorId: session.id } })
  bustCache('announcements:')
  // notify all users
  const users = await db.user.findMany({ select: { id: true } })
  await db.notification.createMany({
    data: users.map((u) => ({ userId: u.id, title: `Announcement: ${title}`, body: body.slice(0, 120), type: 'info' })),
  })
  return NextResponse.json({ ok: true, id: a.id })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.announcement.delete({ where: { id } })
  bustCache('announcements:')
  return NextResponse.json({ ok: true })
}
