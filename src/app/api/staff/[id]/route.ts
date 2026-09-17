import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, invalidateSessionCache } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  for (const k of ['name', 'email', 'role', 'status', 'department', 'phone', 'avatar', 'bio']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.subjects !== undefined) data.subjects = JSON.stringify(body.subjects)
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
