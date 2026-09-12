import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'startDate', 'endDate']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.isActive !== undefined) {
    if (body.isActive) await db.term.updateMany({ data: { isActive: false } })
    data.isActive = body.isActive
  }
  if (body.holidays !== undefined) data.holidays = JSON.stringify(body.holidays)
  if (body.examWeeks !== undefined) data.examWeeks = JSON.stringify(body.examWeeks)
  const term = await db.term.update({ where: { id }, data })
  return NextResponse.json({ ok: true, term })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.term.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
