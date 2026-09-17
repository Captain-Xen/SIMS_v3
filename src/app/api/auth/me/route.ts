import { NextResponse } from 'next/server'
import { getSessionRaw } from '@/lib/auth'

// Uses the RAW session (not the gated getSession) on purpose: an account with
// mustChangePassword=true must still resolve here so the client can route it
// to the mandatory "Change Your Password" screen. All real data endpoints use
// the gated session and return 401 for such accounts.
export async function GET() {
  const user = await getSessionRaw()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}
