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
  const items = await db.grade.findMany({ where, include: { student: true, teacher: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    grades: items.map((g: any) => ({
      id: g.id,
      studentId: g.studentId,
      studentName: g.student?.name ?? '',
      teacherId: g.teacherId,
      subject: g.subject,
      score: g.score,
      term: g.term,
      createdAt: g.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (Array.isArray(body)) {
    for (const g of body) {
      await db.grade.upsert({
        where: { id: g.id || 'new' },
        update: { score: Number(g.score), subject: g.subject, teacherId: session.id },
        create: { studentId: g.studentId, teacherId: session.id, subject: g.subject, score: Number(g.score), term: g.term || 'Term 1' },
      })
    }
    return NextResponse.json({ ok: true })
  }
  const g = await db.grade.create({ data: { studentId: body.studentId, teacherId: session.id, subject: body.subject, score: Number(body.score), term: body.term || 'Term 1' } })
  return NextResponse.json({ ok: true, id: g.id })
}
