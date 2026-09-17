import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['title', 'author', 'isbn', 'category', 'shelf']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.copies !== undefined) {
    const diff = Number(body.copies) - (await db.book.findUnique({ where: { id } }))!.copies
    data.copies = Number(body.copies)
    data.available = Math.max(0, (await db.book.findUnique({ where: { id } }))!.available + diff)
  }
  const book = await db.book.update({ where: { id }, data })
  return NextResponse.json({ ok: true, book })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.book.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
