import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'
import { getSession, invalidateSessionCache } from '@/lib/auth'
import { bustCache } from '@/lib/cache'
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit'

// DANGEROUS operation (wipes + reseeds the whole database) — therefore locked
// to authenticated Admins only, with its own rate limit as a second gate.
// Previously this endpoint was open, meaning anyone could reset the school's
// data with one POST request.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'Admin') {
    return NextResponse.json({ error: 'Only admins can reseed the database' }, { status: 403 })
  }
  const limit = rateLimit(`seed:${clientIp(req)}`, 3, 10 * 60_000)
  if (!limit.ok) return tooMany(limit.retryAfter, 'Too many reseed attempts. Wait a few minutes.')

  try {
    const result = await seedDatabase()
    // All user ids changed — drop every cached session + payload.
    invalidateSessionCache()
    bustCache('')
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('Seed failed:', e)
    return NextResponse.json({ error: e?.message || 'Seed failed' }, { status: 500 })
  }
}
