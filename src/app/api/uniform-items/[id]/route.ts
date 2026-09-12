import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'category']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.sizes !== undefined) data.sizes = JSON.stringify(body.sizes)
  if (body.price !== undefined) data.price = Number(body.price)
  if (body.stock !== undefined) data.stock = Number(body.stock)
  const item = await db.uniformItem.update({ where: { id }, data })
  return NextResponse.json({ ok: true, item })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.uniformItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
