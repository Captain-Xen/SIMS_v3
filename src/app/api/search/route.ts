import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()
  if (!q) return NextResponse.json({ results: [] })
  const users = await db.user.findMany()
  const results = users
    .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.admissionNo ?? '').toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
    .slice(0, 20)
    .map((u: any) => ({ id: u.id, name: u.name, role: u.role, email: u.email, admissionNo: u.admissionNo, grade: u.grade, className: u.className, avatar: u.avatar, status: u.status }))
  return NextResponse.json({ results })
}
