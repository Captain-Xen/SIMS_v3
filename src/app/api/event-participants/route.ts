import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('eventId')
  const where: any = {}
  if (eventId) where.eventId = eventId
  const participants = await db.eventParticipant.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    participants: participants.map((p: any) => ({
      id: p.id, eventId: p.eventId, userId: p.userId, userName: p.user?.name ?? '',
      userRole: p.user?.role ?? '', role: p.role, createdAt: p.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { eventId, userId, role } = await req.json()
  // check if already a participant
  const existing = await db.eventParticipant.findFirst({ where: { eventId, userId } })
  if (existing) return NextResponse.json({ error: 'Already registered' }, { status: 409 })
  const participant = await db.eventParticipant.create({ data: { eventId, userId, role: role || 'Participant' } })
  return NextResponse.json({ ok: true, id: participant.id })
}
