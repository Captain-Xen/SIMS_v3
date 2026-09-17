import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.uniformItem.findMany({ include: { allocations: true }, orderBy: { name: 'asc' } })
  return NextResponse.json({
    items: items.map((i: any) => ({
      id: i.id, name: i.name, category: i.category,
      sizes: i.sizes ? JSON.parse(i.sizes) : [],
      price: i.price, stock: i.stock,
      allocatedCount: i.allocations.filter((a: any) => a.status === 'Issued').length,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const item = await db.uniformItem.create({
    data: {
      name: body.name, category: body.category || 'General',
      sizes: body.sizes ? JSON.stringify(body.sizes) : null,
      price: Number(body.price) || 0, stock: Number(body.stock) || 0,
    },
  })
  return NextResponse.json({ ok: true, id: item.id })
}
