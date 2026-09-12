import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const withUser = searchParams.get('with') // conversation partner id
  if (withUser) {
    // select only the scalar fields the UI needs — pulling full related user
    // rows here (incl. base64 avatars, bios) made every poll needlessly heavy
    const items = await db.message.findMany({
      where: {
        OR: [
          { fromId: session.id, toId: withUser },
          { fromId: withUser, toId: session.id },
        ],
      },
      select: {
        id: true, fromId: true, toId: true, body: true, read: true, createdAt: true,
        from: { select: { name: true, role: true } },
        to: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      messages: items.map((m: any) => ({
        id: m.id,
        fromId: m.fromId,
        fromName: m.from?.name ?? '',
        fromRole: m.from?.role ?? '',
        toId: m.toId,
        toName: m.to?.name ?? '',
        toRole: m.to?.role ?? '',
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  }
  // return list of conversation partners with last message
  const sent = await db.message.findMany({
    where: { fromId: session.id },
    select: { fromId: true, toId: true, body: true, read: true, createdAt: true, to: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const received = await db.message.findMany({
    where: { toId: session.id },
    select: { fromId: true, toId: true, body: true, read: true, createdAt: true, from: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const partners = new Map<string, { id: string; name: string; role: string; lastMessage: string; createdAt: string; unread: number }>()
  for (const m of received) {
    const p = partners.get(m.fromId)
    const unread = m.read ? 0 : 1
    if (!p || new Date(m.createdAt) > new Date(p.createdAt)) {
      partners.set(m.fromId, { id: m.fromId, name: m.from?.name ?? '', role: m.from?.role ?? '', lastMessage: m.body, createdAt: m.createdAt.toISOString(), unread: (p?.unread ?? 0) + unread })
    } else {
      p.unread += unread
    }
  }
  for (const m of sent) {
    if (!partners.has(m.toId)) {
      partners.set(m.toId, { id: m.toId, name: m.to?.name ?? '', role: m.to?.role ?? '', lastMessage: m.body, createdAt: m.createdAt.toISOString(), unread: 0 })
    }
  }
  return NextResponse.json({ conversations: Array.from(partners.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { toId, body } = await req.json()
  if (!toId || !body) return NextResponse.json({ error: 'Recipient and message required.' }, { status: 400 })
  const m = await db.message.create({ data: { fromId: session.id, toId, body } })
  await db.notification.create({ data: { userId: toId, title: `Message from ${session.name}`, body: body.slice(0, 120), type: 'message' } })
  return NextResponse.json({ ok: true, id: m.id })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { withId } = await req.json()
  await db.message.updateMany({ where: { fromId: withId, toId: session.id, read: false }, data: { read: true } })
  return NextResponse.json({ ok: true })
}
