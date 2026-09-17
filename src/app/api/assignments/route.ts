import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.assignment.findMany({ include: { teacher: true, submissions: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    assignments: items.map((a: any) => {
      const mySub = a.submissions.find((s: any) => s.studentId === session.id)
      return {
        id: a.id,
        teacherId: a.teacherId,
        teacherName: a.teacher?.name ?? '',
        title: a.title,
        description: a.description,
        subject: a.subject,
        className: a.className,
        dueDate: a.dueDate,
        createdAt: a.createdAt.toISOString(),
        submissionStatus: mySub?.status ?? null,
        submissionGrade: mySub?.grade ?? null,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Teachers only' }, { status: 403 })
  const { title, description, subject, className, dueDate } = await req.json()
  const a = await db.assignment.create({ data: { teacherId: session.id, title, description, subject, className, dueDate } })
  // notify students in that class
  const students = await db.user.findMany({ where: { role: 'Student', className } })
  await db.notification.createMany({
    data: students.map((s) => ({ userId: s.id, title: `New assignment: ${title}`, body: `${subject} — due ${dueDate}`, type: 'assignment' })),
  })
  return NextResponse.json({ ok: true, id: a.id })
}
