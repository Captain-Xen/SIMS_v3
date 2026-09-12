import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const slot = await db.conferenceSlot.findUnique({ where: { id } })
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  // teachers can only delete their own slots; admin/principal can delete any
  if (session.role === 'Teacher' && slot.teacherId !== session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await db.conferenceSlot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
