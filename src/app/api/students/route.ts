import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await db.user.findMany({
    where: { role: 'Student' },
    orderBy: { name: 'asc' },
  })
  const fees = await db.fee.findMany()
  const feeMap = new Map(fees.map((f) => [f.studentId, f]))
  const discipline = await db.discipline.findMany({ where: { type: 'Detention' } })
  const susp = await db.discipline.findMany({ where: { type: 'Suspension' } })

  const students = users.map((u: any) => {
    const fee = feeMap.get(u.id)
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      dob: u.dob,
      gender: u.gender,
      bloodGroup: u.bloodGroup,
      admissionNo: u.admissionNo,
      grade: u.grade,
      className: u.className,
      guardian: u.guardian,
      phone: u.phone,
      status: u.status,
      avatar: u.avatar,
      feeStatus: fee?.status ?? 'Pending',
      detentions: discipline.filter((d) => d.studentId === u.id).length,
      suspensions: susp.filter((d) => d.studentId === u.id).length,
    }
  })
  return NextResponse.json({ students })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const count = await db.user.count({ where: { role: 'Student' } })
  const admissionNo = body.admissionNo || `EDU-${String(count + 1).padStart(3, '0')}`
  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email || `${body.name.toLowerCase().replace(/\s+/g, '.')}@edu.edu`,
      password: 'student123',
      role: 'Student',
      status: body.status || 'Active',
      dob: body.dob || null,
      gender: body.gender || null,
      bloodGroup: body.bloodGroup || null,
      admissionNo,
      grade: Number(body.grade) || 7,
      className: body.class || '7A',
      guardian: body.guardian || null,
      phone: body.phone || null,
      bio: body.bio || `Student in ${body.class || '7A'}.`,
    },
  })
  await db.fee.create({ data: { studentId: user.id, amount: Number(body.feeAmount) || 1200, status: 'Pending', dueDate: `${new Date().getFullYear()}-12-15`, term: 'Term 1' } })
  await db.notification.create({ data: { userId: session.id, title: 'Student added', body: `${body.name} was added to ${body.class || '7A'}.`, type: 'success' } })
  return NextResponse.json({ ok: true, id: user.id })
}
