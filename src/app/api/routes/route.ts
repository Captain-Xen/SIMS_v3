import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const routes = await db.busRoute.findMany({ include: { assignments: { include: { student: true } } }, orderBy: { routeName: 'asc' } })
  return NextResponse.json({
    routes: routes.map((r: any) => ({
      id: r.id,
      routeName: r.routeName,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      vehicleNo: r.vehicleNo,
      capacity: r.capacity,
      morningPickup: r.morningPickup,
      eveningDrop: r.eveningDrop,
      stops: r.stops ? JSON.parse(r.stops) : [],
      assignedCount: r.assignments.length,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const route = await db.busRoute.create({
    data: {
      routeName: body.routeName,
      driverName: body.driverName,
      driverPhone: body.driverPhone || null,
      vehicleNo: body.vehicleNo || null,
      capacity: Number(body.capacity) || 30,
      morningPickup: body.morningPickup || null,
      eveningDrop: body.eveningDrop || null,
      stops: JSON.stringify(body.stops || []),
    },
  })
  return NextResponse.json({ ok: true, id: route.id })
}
