import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const events = await db.schoolEvent.findMany({ include: { participants: true }, orderBy: { date: 'asc' } })
  return NextResponse.json({
    events: events.map((e: any) => ({
      id: e.id, title: e.title, type: e.type, description: e.description,
      date: e.date, startTime: e.startTime, endTime: e.endTime, venue: e.venue,
      status: e.status, participantCount: e.participants.length,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const event = await db.schoolEvent.create({
    data: {
      title: body.title, type: body.type || 'Activity', description: body.description || null,
      date: body.date, startTime: body.startTime || null, endTime: body.endTime || null,
      venue: body.venue || null, status: body.status || 'Planned',
    },
  })
  return NextResponse.json({ ok: true, id: event.id })
}
