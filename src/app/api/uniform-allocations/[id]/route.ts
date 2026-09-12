import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const allocation = await db.uniformAllocation.findUnique({ where: { id } })
  if (allocation && allocation.status === 'Issued') {
    // return stock
    const item = await db.uniformItem.findUnique({ where: { id: allocation.uniformId } })
    if (item) await db.uniformItem.update({ where: { id: item.id }, data: { stock: item.stock + allocation.quantity } })
  }
  await db.uniformAllocation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
