import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // teachers see only their own slots; staff/students see all
  const where = session.role === 'Teacher' ? { teacherId: session.id } : {}
  const slots = await db.conferenceSlot.findMany({ where, include: { teacher: true, booking: { include: { parent: true } } }, orderBy: { date: 'asc' } })
  return NextResponse.json({
    slots: slots.map((s: any) => ({
      id: s.id, teacherId: s.teacherId, teacherName: s.teacher?.name ?? '',
      date: s.date, startTime: s.startTime, endTime: s.endTime, isBooked: s.isBooked,
      bookingStudentName: s.booking?.studentName ?? null,
      bookingParentName: s.booking?.parent?.name ?? null,
      bookingStatus: s.booking?.status ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  // teachers create for themselves; admin/principal can specify teacherId
  const teacherId = session.role === 'Teacher' ? session.id : (body.teacherId || session.id)
  const slot = await db.conferenceSlot.create({
    data: { teacherId, date: body.date, startTime: body.startTime, endTime: body.endTime },
  })
  return NextResponse.json({ ok: true, id: slot.id })
}
