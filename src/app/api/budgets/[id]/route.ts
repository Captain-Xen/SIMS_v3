import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.category !== undefined) data.category = body.category
  if (body.allocated !== undefined) data.allocated = Number(body.allocated)
  if (body.period !== undefined) data.period = body.period
  const budget = await db.budget.update({ where: { id }, data })
  return NextResponse.json({ ok: true, budget })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.budget.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
