import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, invalidateSessionCache } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.discipline.findMany({ include: { student: true, issuer: true }, orderBy: { date: 'desc' } })
  return NextResponse.json({
    discipline: items.map((d: any) => ({
      id: d.id,
      studentId: d.studentId,
      studentName: d.student?.name ?? '',
      type: d.type,
      reason: d.reason,
      date: d.date,
      issuerName: d.issuer?.name ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { studentId, type, reason } = await req.json()
  const d = await db.discipline.create({ data: { studentId, issuerId: session.id, type, reason, date: new Date().toISOString().slice(0, 10) } })
  // escalation: 3 detentions -> 1 suspension, 3 suspensions -> at-risk, 4th -> expelled
  const detentions = await db.discipline.count({ where: { studentId, type: 'Detention' } })
  const suspensions = await db.discipline.count({ where: { studentId, type: 'Suspension' } })
  if (type === 'Detention' && detentions > 0 && detentions % 3 === 0) {
    await db.discipline.create({ data: { studentId, issuerId: session.id, type: 'Suspension', reason: 'Automatic: 3 detentions', date: new Date().toISOString().slice(0, 10) } })
  }
  if (suspensions >= 4) {
    await db.user.update({ where: { id: studentId }, data: { status: 'Expelled' } })
    invalidateSessionCache(studentId)
  }
  return NextResponse.json({ ok: true, id: d.id })
}
