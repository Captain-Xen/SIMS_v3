import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const where: any = {}
  if (subjectId) where.subjectId = subjectId
  // teachers see only their own reviews; admins/principals see all
  if (session.role === 'Teacher') where.subjectId = session.id
  const reviews = await db.performanceReview.findMany({ where, include: { subject: true, reviewer: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({
    reviews: reviews.map((r: any) => ({
      id: r.id, subjectId: r.subjectId, subjectName: r.subject?.name ?? '', subjectRole: r.subject?.role ?? '',
      reviewerId: r.reviewerId, reviewerName: r.reviewer?.name ?? '',
      period: r.period, rating: r.rating, teaching: r.teaching, punctuality: r.punctuality,
      professionalism: r.professionalism, studentEngagement: r.studentEngagement,
      comments: r.comments, goals: r.goals, createdAt: r.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const review = await db.performanceReview.create({
    data: {
      subjectId: body.subjectId, reviewerId: session.id, period: body.period,
      rating: Number(body.rating) || 3, teaching: Number(body.teaching) || 0,
      punctuality: Number(body.punctuality) || 0, professionalism: Number(body.professionalism) || 0,
      studentEngagement: Number(body.studentEngagement) || 0,
      comments: body.comments || null, goals: body.goals || null,
    },
  })
  return NextResponse.json({ ok: true, id: review.id })
}
