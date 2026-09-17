import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // students see only their own assignment
  const where = session.role === 'Student' ? { studentId: session.id } : {}
  const items = await db.busAssignment.findMany({ where, include: { route: true, student: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    assignments: items.map((a: any) => ({
      id: a.id,
      routeId: a.routeId,
      routeName: a.route?.routeName ?? '',
      studentId: a.studentId,
      studentName: a.student?.name ?? '',
      studentClass: a.student?.className ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { routeId, studentId } = await req.json()
  // check capacity
  const route = await db.busRoute.findUnique({ where: { id: routeId }, include: { assignments: true } })
  if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  if (route.assignments.length >= route.capacity) return NextResponse.json({ error: 'Route is at full capacity' }, { status: 409 })
  // check if student already assigned to a route
  const existing = await db.busAssignment.findFirst({ where: { studentId } })
  if (existing) {
    await db.busAssignment.update({ where: { id: existing.id }, data: { routeId } })
    return NextResponse.json({ ok: true, reassigned: true })
  }
  const assignment = await db.busAssignment.create({ data: { routeId, studentId } })
  return NextResponse.json({ ok: true, id: assignment.id })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const { id } = await req.json()
  await db.busAssignment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
