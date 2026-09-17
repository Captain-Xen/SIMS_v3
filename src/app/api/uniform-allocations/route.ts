import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // students see only their own allocations
  const where = session.role === 'Student' ? { userId: session.id } : {}
  const allocations = await db.uniformAllocation.findMany({ where, include: { uniform: true, user: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    allocations: allocations.map((a: any) => ({
      id: a.id, uniformId: a.uniformId, uniformName: a.uniform?.name ?? '',
      userId: a.userId, userName: a.user?.name ?? '',
      size: a.size, quantity: a.quantity, status: a.status, date: a.date,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { uniformId, userId, size, quantity } = await req.json()
  const item = await db.uniformItem.findUnique({ where: { id: uniformId } })
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const qty = Number(quantity) || 1
  if (item.stock < qty) return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 })
  const allocation = await db.uniformAllocation.create({
    data: { uniformId, userId, size, quantity: qty, date: new Date().toISOString().slice(0, 10) },
  })
  await db.uniformItem.update({ where: { id: uniformId }, data: { stock: item.stock - qty } })
  await db.notification.create({ data: { userId, title: 'Uniform issued', body: `You have been issued a ${item.name} (size ${size}).`, type: 'info' } })
  return NextResponse.json({ ok: true, id: allocation.id })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id, status } = await req.json()
  const allocation = await db.uniformAllocation.update({ where: { id }, data: { status } })
  if (status === 'Returned') {
    const item = await db.uniformItem.findUnique({ where: { id: allocation.uniformId } })
    if (item) await db.uniformItem.update({ where: { id: item.id }, data: { stock: item.stock + allocation.quantity } })
  }
  return NextResponse.json({ ok: true })
}
