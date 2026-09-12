import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, invalidateSessionCache } from '@/lib/auth'

// Alumni = Users with role 'Student' and status 'Graduated'
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const where: any = { role: 'Student', status: 'Graduated' }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { admissionNo: { contains: q } },
    ]
  }
  const users = await db.user.findMany({ where, orderBy: { name: 'asc' } })
  return NextResponse.json({
    alumni: users.map((u: any) => ({
      id: u.id, name: u.name, email: u.email, admissionNo: u.admissionNo,
      gradYear: u.updatedAt.getFullYear(), lastGrade: u.grade ?? 0, lastClass: u.className,
      avatar: u.avatar, bio: u.bio, phone: u.phone, status: u.status,
    })),
  })
}

// POST: mark a student as graduated (status = Graduated)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { studentId } = await req.json()
  const user = await db.user.update({ where: { id: studentId }, data: { status: 'Graduated' } })
  invalidateSessionCache(studentId)
  return NextResponse.json({ ok: true, id: user.id })
}
