import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['type', 'title', 'description', 'severity', 'date']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  const record = await db.healthRecord.update({ where: { id }, data })
  return NextResponse.json({ ok: true, record })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.healthRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
