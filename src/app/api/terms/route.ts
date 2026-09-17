import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const terms = await db.term.findMany({ orderBy: { startDate: 'desc' } })
  return NextResponse.json({
    terms: terms.map((t: any) => ({
      id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, isActive: t.isActive,
      holidays: t.holidays ? JSON.parse(t.holidays) : [],
      examWeeks: t.examWeeks ? JSON.parse(t.examWeeks) : [],
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  // if isActive, deactivate all others
  if (body.isActive) {
    await db.term.updateMany({ data: { isActive: false } })
  }
  const term = await db.term.create({
    data: {
      name: body.name, startDate: body.startDate, endDate: body.endDate,
      isActive: body.isActive ?? false,
      holidays: body.holidays ? JSON.stringify(body.holidays) : null,
      examWeeks: body.examWeeks ? JSON.stringify(body.examWeeks) : null,
    },
  })
  return NextResponse.json({ ok: true, id: term.id })
}
