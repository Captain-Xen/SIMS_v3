import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const where: any = {}
  if (date) where.date = date
  const items = await db.attendance.findMany({ where, include: { student: true }, orderBy: { date: 'desc' } })
  return NextResponse.json({
    attendance: items.map((a: any) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student?.name ?? '',
      date: a.date,
      status: a.status,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { records, date } = await req.json()
  // upsert attendance for the given date
  for (const r of records) {
    const existing = await db.attendance.findFirst({ where: { studentId: r.studentId, date } })
    if (existing) {
      await db.attendance.update({ where: { id: existing.id }, data: { status: r.status } })
    } else {
      await db.attendance.create({ data: { studentId: r.studentId, date, status: r.status } })
    }
  }
  return NextResponse.json({ ok: true })
}
