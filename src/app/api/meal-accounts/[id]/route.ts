import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.mealPlan !== undefined) data.mealPlan = body.mealPlan
  if (body.dietaryTags !== undefined) data.dietaryTags = JSON.stringify(body.dietaryTags)
  // students can only update their own account; staff can update any
  if (session.role === 'Student') {
    const acct = await db.mealAccount.findUnique({ where: { id } })
    if (!acct || acct.userId !== session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const account = await db.mealAccount.update({ where: { id }, data })
  return NextResponse.json({ ok: true, account })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await params
  await db.mealAccount.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
