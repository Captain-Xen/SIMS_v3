import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit'

// Email API — Resend-ready. If RESEND_API_KEY is configured, sends a real email;
// otherwise logs the email and returns success (demo mode).
// Authenticated callers only + per-user rate limiting + payload caps so the
// endpoint can never be used as a mail relay or cost amplifier.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = rateLimit(`email:${clientIp(req)}:${session.id}`, 10, 5 * 60_000)
  if (!limit.ok) return tooMany(limit.retryAfter, 'Email rate limit reached. Try again in a few minutes.')

  const raw = await req.json().catch(() => ({}))
  const to = typeof raw?.to === 'string' ? raw.to.trim() : ''
  const subject = typeof raw?.subject === 'string' ? raw.subject.trim() : ''
  const body = typeof raw?.body === 'string' ? raw.body : ''
  if (!to || !subject) return NextResponse.json({ error: 'Recipient and subject required.' }, { status: 400 })
  if (to.length > 254 || subject.length > 300 || body.length > 5000) {
    return NextResponse.json({ error: 'Email payload too large.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid recipient address.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'School Name <onboarding@resend.dev>'

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, html: `<p>${body}</p>` }),
      })
      if (!res.ok) {
        const txt = await res.text()
        return NextResponse.json({ error: `Email provider error: ${txt}` }, { status: 502 })
      }
      return NextResponse.json({ ok: true, mode: 'live' })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Email failed' }, { status: 502 })
    }
  }

  // Demo mode: log + record a notification to the recipient if they exist
  console.log(`[EMAIL-DEMO] to=${to} subject="${subject}" body="${body}"`)
  const recipient = await db.user.findUnique({ where: { email: to.toLowerCase().trim() } })
  if (recipient) {
    await db.notification.create({ data: { userId: recipient.id, title: subject, body: body.slice(0, 200), type: 'info' } })
  }
  return NextResponse.json({ ok: true, mode: 'demo' })
}
