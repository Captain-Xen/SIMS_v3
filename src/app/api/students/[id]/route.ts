import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, invalidateSessionCache } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'email', 'dob', 'gender', 'bloodGroup', 'admissionNo', 'guardian', 'phone', 'status', 'avatar', 'bio']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.grade !== undefined) data.grade = Number(body.grade)
  if (body.class !== undefined) data.className = body.class
  const user = await db.user.update({ where: { id }, data })
  invalidateSessionCache(id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.user.delete({ where: { id } })
  invalidateSessionCache(id)
  return NextResponse.json({ ok: true })
}
