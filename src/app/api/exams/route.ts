import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const className = searchParams.get('class')
  const where: any = {}
  if (className) where.className = className
  // students see only exams for their class
  if (session.role === 'Student') where.className = session.className ?? ''
  const items = await db.exam.findMany({ where, include: { createdBy: true }, orderBy: { date: 'asc' } })
  return NextResponse.json({
    exams: items.map((e: any) => ({
      id: e.id,
      title: e.title,
      subject: e.subject,
      className: e.className,
      date: e.date,
      startTime: e.startTime,
      duration: e.duration,
      room: e.room,
      totalMarks: e.totalMarks,
      passingMarks: e.passingMarks,
      notes: e.notes,
      createdByName: e.createdBy?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const exam = await db.exam.create({
    data: {
      title: body.title,
      subject: body.subject,
      className: body.className,
      date: body.date,
      startTime: body.startTime || '09:00',
      duration: Number(body.duration) || 120,
      room: body.room || null,
      totalMarks: Number(body.totalMarks) || 100,
      passingMarks: Number(body.passingMarks) || 40,
      notes: body.notes || null,
      createdById: session.id,
    },
  })
  // notify students in that class
  const students = await db.user.findMany({ where: { role: 'Student', className: body.className } })
  await db.notification.createMany({
    data: students.map((s) => ({ userId: s.id, title: `Exam scheduled: ${body.title}`, body: `${body.subject} on ${body.date} at ${body.startTime || '09:00'}${body.room ? ' in ' + body.room : ''}`, type: 'warning' })),
  })
  return NextResponse.json({ ok: true, id: exam.id })
}
