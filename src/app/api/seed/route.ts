import { NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed'
import { invalidateSessionCache } from '@/lib/auth'
import { bustCache } from '@/lib/cache'

export async function POST() {
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
