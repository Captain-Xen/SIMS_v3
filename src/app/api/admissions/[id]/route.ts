import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes
  data.reviewedById = session.id
  const admission = await db.admission.update({ where: { id }, data })
  // If status is "Enrolled", create a student user account
  if (body.status === 'Enrolled') {
    const existing = await db.user.findUnique({ where: { email: admission.email.toLowerCase() } })
    if (!existing) {
      const count = await db.user.count({ where: { role: 'Student' } })
      const admissionNo = `EDU-${String(count + 1).padStart(3, '0')}`
      await db.user.create({
        data: {
          name: admission.applicantName,
          email: admission.email.toLowerCase(),
          password: 'student123',
          role: 'Student',
          status: 'Active',
          dob: admission.dob,
          gender: admission.gender,
          admissionNo,
          grade: admission.gradeApplied,
          className: `${admission.gradeApplied}A`,
          guardian: admission.parentName,
          phone: admission.parentPhone,
          bio: `Enrolled via admissions process.`,
        },
      })
    }
  }
  return NextResponse.json({ ok: true, admission })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.admission.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
