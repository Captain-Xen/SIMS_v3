import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where = session.role === 'Student' ? { parentId: session.id } : {}
  const bookings = await db.conferenceBooking.findMany({ where, include: { slot: { include: { teacher: true } }, parent: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    bookings: bookings.map((b: any) => ({
      id: b.id, slotId: b.slotId,
      teacherName: b.slot?.teacher?.name ?? '',
      date: b.slot?.date ?? '', startTime: b.slot?.startTime ?? '', endTime: b.slot?.endTime ?? '',
      parentId: b.parentId, parentName: b.parent?.name ?? '',
      studentName: b.studentName, notes: b.notes, status: b.status,
      createdAt: b.createdAt.toISOString(),
    })),
  })
}

// POST: book a slot (students/parents book)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slotId, studentName, notes } = await req.json()
  const slot = await db.conferenceSlot.findUnique({ where: { id: slotId } })
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  if (slot.isBooked) return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })
  const booking = await db.conferenceBooking.create({ data: { slotId, parentId: session.id, studentName, notes: notes || null } })
  await db.conferenceSlot.update({ where: { id: slotId }, data: { isBooked: true } })
  // notify the teacher
  await db.notification.create({ data: { userId: slot.teacherId, title: 'Conference booked', body: `A parent booked a slot on ${slot.date} at ${slot.startTime}.`, type: 'info' } })
  return NextResponse.json({ ok: true, id: booking.id })
}

// PATCH: update booking status (cancel/complete)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  const booking = await db.conferenceBooking.update({ where: { id }, data: { status } })
  if (status === 'Cancelled') {
    await db.conferenceSlot.update({ where: { id: booking.slotId }, data: { isBooked: false } })
  }
  return NextResponse.json({ ok: true })
}
