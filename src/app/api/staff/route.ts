import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await db.user.findMany({
    where: { role: { not: 'Student' } },
    orderBy: { name: 'asc' },
  })
  const staff = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    department: u.department,
    subjects: u.subjects,
    avatar: u.avatar,
    phone: u.phone,
  }))
  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email || `${body.name.toLowerCase().replace(/\s+/g, '.')}@edu.edu`,
      password: 'staff123',
      role: body.role || 'Teacher',
      status: body.status || 'Active',
      department: body.department || 'General',
      subjects: JSON.stringify(body.subjects || []),
      phone: body.phone || null,
      bio: body.bio || `${body.role || 'Teacher'} at EduCenterJM.`,
    },
  })
  return NextResponse.json({ ok: true, id: user.id })
}
