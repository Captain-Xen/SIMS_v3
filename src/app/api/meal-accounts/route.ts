import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // students see only their own account; staff see all
  if (session.role === 'Student') {
    const acct = await db.mealAccount.findUnique({ where: { userId: session.id }, include: { user: true, transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } })
    return NextResponse.json({ account: acct ? {
      id: acct.id, userId: acct.userId, userName: acct.user.name,
      balance: acct.balance, dietaryTags: acct.dietaryTags ? JSON.parse(acct.dietaryTags) : [],
      mealPlan: acct.mealPlan, updatedAt: acct.updatedAt.toISOString(),
      transactions: acct.transactions.map((t: any) => ({ id: t.id, accountId: t.accountId, type: t.type, amount: t.amount, description: t.description, date: t.date, createdAt: t.createdAt.toISOString() })),
    } : null })
  }
  const accounts = await db.mealAccount.findMany({ include: { user: true }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json({
    accounts: accounts.map((a: any) => ({
      id: a.id, userId: a.userId, userName: a.user.name,
      balance: a.balance, dietaryTags: a.dietaryTags ? JSON.parse(a.dietaryTags) : [],
      mealPlan: a.mealPlan, updatedAt: a.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { userId, mealPlan, dietaryTags, initialBalance } = await req.json()
  const acct = await db.mealAccount.create({
    data: {
      userId,
      mealPlan: mealPlan || 'Standard',
      dietaryTags: dietaryTags ? JSON.stringify(dietaryTags) : null,
      balance: Number(initialBalance) || 0,
    },
  })
  return NextResponse.json({ ok: true, id: acct.id })
}
