import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const facilities = await db.facility.findMany({ orderBy: { name: 'asc' }, include: { bookings: true } })
  return NextResponse.json({
    facilities: facilities.map((f: any) => ({
      id: f.id, name: f.name, type: f.type, capacity: f.capacity, location: f.location,
      isBookable: f.isBookable, notes: f.notes,
      bookingCount: f.bookings.filter((b: any) => b.status === 'Approved').length,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const facility = await db.facility.create({
    data: {
      name: body.name, type: body.type || 'Room', capacity: Number(body.capacity) || 30,
      location: body.location || null, isBookable: body.isBookable ?? true, notes: body.notes || null,
    },
  })
  return NextResponse.json({ ok: true, id: facility.id })
}
