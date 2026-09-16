import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, invalidateSessionCache } from '@/lib/auth'
import { bustCache } from '@/lib/cache'

// ---------------------------------------------------------------------------
// Image upload endpoint. Stores images as base64 data URLs (SQLite-friendly,
// survives DB copies, no filesystem permissions needed):
//   POST   { dataUrl, kind? }   kind === 'logo' -> school logo (Admin only),
//                               otherwise -> the signed-in user's avatar
//   DELETE { kind? }            clears the logo or the caller's avatar
//
// Client-side images are downscaled before upload (see resizeImageToDataUrl in
// lib/api.ts), so payloads stay small; the caps below are a server-side
// backstop rather than the expected size.
// ---------------------------------------------------------------------------

const MAX_DATA_URL_CHARS = 2_000_000 // ~1.5MB binary after base64 decode
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/

function validateDataUrl(dataUrl: unknown): string | null {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_DATA_URL_CHARS) return null
  return DATA_URL_RE.test(dataUrl) ? dataUrl : null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { dataUrl?: unknown; kind?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const dataUrl = validateDataUrl(body.dataUrl)
  if (!dataUrl) {
    return NextResponse.json(
      { error: 'Please upload a valid image (PNG, JPEG, WebP or GIF, under 1.5MB).' },
      { status: 400 },
    )
  }

  // School logo — matches the Settings surface, which is Admin-only.
  if (body.kind === 'logo') {
    if (session.role !== 'Admin') {
      return NextResponse.json({ error: 'Only admins can change the school logo' }, { status: 403 })
    }
    await db.schoolSettings.upsert({
      where: { id: 'singleton' },
      // Bump version so every connected client live-syncs the new logo.
      update: { logo: dataUrl, version: { increment: 1 } },
      create: { logo: dataUrl },
    })
    bustCache('settings:')
    return NextResponse.json({ ok: true, logo: dataUrl })
  }

  // Default: own profile picture
  await db.user.update({ where: { id: session.id }, data: { avatar: dataUrl } })
  invalidateSessionCache(session.id)
  return NextResponse.json({ ok: true, avatar: dataUrl })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { kind?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // empty body -> treat as avatar removal
  }

  if (body.kind === 'logo') {
    if (session.role !== 'Admin') {
      return NextResponse.json({ error: 'Only admins can change the school logo' }, { status: 403 })
    }
    const existing = await db.schoolSettings.findUnique({ where: { id: 'singleton' }, select: { id: true } })
    if (!existing) return NextResponse.json({ ok: true, logo: null }) // nothing to remove
    await db.schoolSettings.update({
      where: { id: 'singleton' },
      data: { logo: null, version: { increment: 1 } },
    })
    bustCache('settings:')
    return NextResponse.json({ ok: true, logo: null })
  }

  await db.user.update({ where: { id: session.id }, data: { avatar: null } })
  invalidateSessionCache(session.id)
  return NextResponse.json({ ok: true, avatar: null })
}
