import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const budgets = await db.budget.findMany({ include: { expenses: true }, orderBy: { category: 'asc' } })
  return NextResponse.json({
    budgets: budgets.map((b: any) => ({
      id: b.id, category: b.category, allocated: b.allocated, period: b.period,
      spent: b.expenses.reduce((sum: number, e: any) => sum + e.amount, 0),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const budget = await db.budget.create({ data: { category: body.category, allocated: Number(body.allocated) || 0, period: body.period || String(new Date().getFullYear()) } })
  return NextResponse.json({ ok: true, id: budget.id })
}
