import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status) where.status = status
  const admissions = await db.admission.findMany({ where, include: { reviewedBy: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    admissions: admissions.map((a: any) => ({
      id: a.id, applicantName: a.applicantName, email: a.email, phone: a.phone, dob: a.dob, gender: a.gender,
      gradeApplied: a.gradeApplied, parentName: a.parentName, parentPhone: a.parentPhone, parentEmail: a.parentEmail,
      address: a.address, previousSchool: a.previousSchool, status: a.status, notes: a.notes,
      reviewedByName: a.reviewedBy?.name ?? null, createdAt: a.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  // Admissions applications can be submitted by anyone (even without login for public applicants)
  // But for this app, we require at least a session OR allow public submission
  const body = await req.json()
  const admission = await db.admission.create({
    data: {
      applicantName: body.applicantName, email: body.email, phone: body.phone || null,
      dob: body.dob || null, gender: body.gender || null, gradeApplied: Number(body.gradeApplied) || 7,
      parentName: body.parentName || null, parentPhone: body.parentPhone || null, parentEmail: body.parentEmail || null,
      address: body.address || null, previousSchool: body.previousSchool || null,
    },
  })
  return NextResponse.json({ ok: true, id: admission.id })
}
