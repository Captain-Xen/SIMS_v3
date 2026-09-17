import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const where: any = {}
  if (accountId) where.accountId = accountId
  const items = await db.mealTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({
    transactions: items.map((t: any) => ({
      id: t.id, accountId: t.accountId, type: t.type, amount: t.amount, description: t.description, date: t.date, createdAt: t.createdAt.toISOString(),
    })),
  })
}

// POST: topup or purchase
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { accountId, type, amount, description } = await req.json()
  const acct = await db.mealAccount.findUnique({ where: { id: accountId } })
  if (!acct) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  // students can only transact on their own account
  if (session.role === 'Student' && acct.userId !== session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // purchases (negative amount) check balance
  const amt = Number(amount)
  if (type === 'Purchase' && acct.balance + amt < 0) return NextResponse.json({ error: 'Insufficient balance' }, { status: 409 })
  const tx = await db.mealTransaction.create({ data: { accountId, type, amount: amt, description, date: new Date().toISOString().slice(0, 10) } })
  await db.mealAccount.update({ where: { id: accountId }, data: { balance: acct.balance + amt } })
  return NextResponse.json({ ok: true, id: tx.id })
}
