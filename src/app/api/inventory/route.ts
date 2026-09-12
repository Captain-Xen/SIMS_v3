import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const where: any = {}
  if (category) where.category = category
  const items = await db.inventoryItem.findMany({ where, orderBy: { name: 'asc' } })
  return NextResponse.json({
    items: items.map((i: any) => ({
      id: i.id, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit,
      condition: i.condition, location: i.location, minStock: i.minStock, notes: i.notes,
      updatedAt: i.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const item = await db.inventoryItem.create({
    data: {
      name: body.name, category: body.category || 'General', quantity: Number(body.quantity) || 0,
      unit: body.unit || 'pcs', condition: body.condition || 'Good', location: body.location || null,
      minStock: Number(body.minStock) || 0, notes: body.notes || null,
    },
  })
  return NextResponse.json({ ok: true, id: item.id })
}
