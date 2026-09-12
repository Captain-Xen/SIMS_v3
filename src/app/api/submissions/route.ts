import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { assignmentId, content } = await req.json()
  const existing = await db.submission.findFirst({ where: { assignmentId, studentId: session.id } })
  let sub
  if (existing) {
    sub = await db.submission.update({ where: { id: existing.id }, data: { content, status: 'Submitted' } })
  } else {
    sub = await db.submission.create({ data: { assignmentId, studentId: session.id, content } })
  }
  return NextResponse.json({ ok: true, id: sub.id })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, grade, feedback } = await req.json()
  const sub = await db.submission.update({ where: { id }, data: { grade: Number(grade), feedback, status: 'Graded' } })
  await db.notification.create({ data: { userId: sub.studentId, title: 'Assignment graded', body: `Your submission received ${grade}/100.`, type: 'assignment' } })
  return NextResponse.json({ ok: true })
}
