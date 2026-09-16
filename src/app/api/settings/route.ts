import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getCached, setCached, bustCache } from '@/lib/cache'
import { parseFeatures, stringifyFeatures } from '@/lib/features'
import { NAV } from '@/components/app/nav'
import type { SchoolSettings } from '@/lib/types'

const CACHE_KEY = 'settings:singleton'

type DbSettings = {
  id: string; name: string; tagline: string; logo: string | null; accent: string
  email: string; phone: string; address: string; features: string; version: number
}

/** Normalize a DB row into the API shape (features JSON string -> object). */
function serialize(s: DbSettings): SchoolSettings {
  return { ...s, features: parseFeatures(s.features) }
}

const KNOWN_VIEW_IDS = new Set<string>(NAV.map((n) => n.id))

function cleanFeatures(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const cleaned: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (KNOWN_VIEW_IDS.has(k) && typeof v === 'boolean') cleaned[k] = v
  }
  return stringifyFeatures(cleaned)
}

export async function GET(req: NextRequest) {
  // Lightweight live-sync probe: clients poll just the version number.
  const mode = req.nextUrl.searchParams.get('mode')
  if (mode === 'version') {
    const row = await db.schoolSettings.findUnique({
      where: { id: 'singleton' },
      select: { version: true },
    })
    // 304-style semantics in a body: only the number travels (~15 bytes).
    return NextResponse.json({ version: row?.version ?? 0 })
  }

  // Fetched on every page load by every client — cache briefly.
  const cached = getCached<DbSettings>(CACHE_KEY)
  if (cached) return NextResponse.json({ settings: serialize(cached) })

  const s = await db.schoolSettings.findUnique({ where: { id: 'singleton' } })
  if (s) setCached(CACHE_KEY, s, 30_000)
  return NextResponse.json({ settings: s ? serialize(s) : null })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['name', 'tagline', 'logo', 'accent', 'email', 'phone', 'address']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.features !== undefined) {
    const features = cleanFeatures(body.features)
    if (features === null) {
      return NextResponse.json({ error: 'Invalid features payload' }, { status: 400 })
    }
    data.features = features
  }
  // Any settings change bumps the version so every client picks it up live.
  const s = await db.schoolSettings.upsert({
    where: { id: 'singleton' },
    update: { ...data, version: { increment: 1 } },
    create: { id: 'singleton', ...data },
  })
  bustCache('settings:')
  return NextResponse.json({ ok: true, settings: serialize(s) })
}
