import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')
  const where: any = {}
  if (studentId) where.studentId = studentId
  const items = await db.healthRecord.findMany({ where, include: { student: true, recordedBy: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    records: items.map((r: any) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student?.name ?? '',
      type: r.type,
      title: r.title,
      description: r.description,
      severity: r.severity,
      date: r.date,
      recordedByName: r.recordedBy?.name ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { studentId, type, title, description, severity, date } = await req.json()
  const record = await db.healthRecord.create({
    data: { studentId, type, title, description: description || null, severity: severity || 'Low', date: date || null, recordedById: session.id },
  })
  return NextResponse.json({ ok: true, id: record.id })
}
