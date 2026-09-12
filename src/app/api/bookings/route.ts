import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status) where.status = status
  const bookings = await db.booking.findMany({ where, include: { facility: true, requestedBy: true, reviewedBy: true }, orderBy: { date: 'asc' } })
  return NextResponse.json({
    bookings: bookings.map((b: any) => ({
      id: b.id, facilityId: b.facilityId, facilityName: b.facility?.name ?? '', facilityType: b.facility?.type ?? '',
      requestedById: b.requestedById, requestedByName: b.requestedBy?.name ?? null,
      title: b.title, purpose: b.purpose, date: b.date, startTime: b.startTime, endTime: b.endTime,
      status: b.status, reviewedByName: b.reviewedBy?.name ?? null, createdAt: b.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { facilityId, title, purpose, date, startTime, endTime } = await req.json()
  const booking = await db.booking.create({
    data: { facilityId, title, purpose, date, startTime, endTime, requestedById: session.id },
  })
  return NextResponse.json({ ok: true, id: booking.id })
}
