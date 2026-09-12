import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH: check out a visitor
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const visitor = await db.visitor.findUnique({ where: { id } })
  if (!visitor) return NextResponse.json({ error: 'Visitor not found' }, { status: 404 })
  const updated = await db.visitor.update({ where: { id }, data: { checkOutTime: new Date().toISOString(), status: 'CheckedOut' } })
  return NextResponse.json({ ok: true, visitor: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.visitor.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
