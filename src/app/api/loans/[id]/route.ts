import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// PATCH: return a book (mark returned)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const loan = await db.loan.findUnique({ where: { id }, include: { book: true } })
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  const today = new Date().toISOString().slice(0, 10)
  await db.loan.update({ where: { id }, data: { returnDate: today, status: 'Returned' } })
  await db.book.update({ where: { id: loan.bookId }, data: { available: loan.book.available + 1 } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.loan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
