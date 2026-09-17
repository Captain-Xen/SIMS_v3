import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const expenses = await db.expense.findMany({ include: { recordedBy: true }, orderBy: { date: 'desc' } })
  return NextResponse.json({
    expenses: expenses.map((e: any) => ({
      id: e.id, budgetId: e.budgetId, description: e.description, amount: e.amount,
      category: e.category, date: e.date, recordedByName: e.recordedBy?.name ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const expense = await db.expense.create({
    data: {
      budgetId: body.budgetId || null, description: body.description, amount: Number(body.amount) || 0,
      category: body.category, date: body.date || new Date().toISOString().slice(0, 10),
      recordedById: session.id,
    },
  })
  return NextResponse.json({ ok: true, id: expense.id })
}
