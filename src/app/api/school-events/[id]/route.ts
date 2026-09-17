import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['title', 'type', 'description', 'date', 'startTime', 'endTime', 'venue', 'status']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const event = await db.schoolEvent.update({ where: { id }, data })
  return NextResponse.json({ ok: true, event })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.schoolEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
