import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status) where.status = status
  const items = await db.visitor.findMany({ where, include: { checkedInBy: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    visitors: items.map((v: any) => ({
      id: v.id, name: v.name, phone: v.phone, email: v.email, purpose: v.purpose,
      visitingWhom: v.visitingWhom, checkInTime: v.checkInTime, checkOutTime: v.checkOutTime,
      status: v.status, gatePassNo: v.gatePassNo, checkedInByName: v.checkedInBy?.name ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, phone, email, purpose, visitingWhom } = await req.json()
  const now = new Date()
  const checkInTime = now.toISOString()
  const gatePassNo = `GP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
  const visitor = await db.visitor.create({
    data: { name, phone: phone || null, email: email || null, purpose, visitingWhom: visitingWhom || null, checkInTime, gatePassNo, checkedInById: session.id },
  })
  return NextResponse.json({ ok: true, id: visitor.id, gatePassNo })
}
