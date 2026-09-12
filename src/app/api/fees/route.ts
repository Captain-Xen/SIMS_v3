import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.fee.findMany({ include: { student: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    fees: items.map((f: any) => ({
      id: f.id,
      studentId: f.studentId,
      studentName: f.student?.name ?? '',
      amount: f.amount,
      status: f.status,
      dueDate: f.dueDate,
      term: f.term,
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  await db.fee.update({ where: { id }, data: { status } })
  return NextResponse.json({ ok: true })
}
