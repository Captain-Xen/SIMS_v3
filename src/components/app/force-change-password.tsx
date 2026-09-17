'use client'

// Mandatory "Change Your Password" screen — the only thing an account with
// mustChangePassword=true can see. The backend independently blocks every
// other endpoint for such sessions (see getSession in src/lib/auth.ts), so
// this is UX on top of a server-enforced gate, not the gate itself.

import { useState } from 'react'
import { GraduationCap, KeyRound, Loader2, LogOut, Eye, EyeOff, ShieldAlert, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function ForceChangePassword() {
  const user = useAppStore((s) => s.user) as SessionUser
  const setUser = useAppStore((s) => s.setUser)
  const addToast = useAppStore((s) => s.addToast)
  const settings = useAppStore((s) => s.settings)
  const schoolName = settings?.name || 'School Name'
  const logo = settings?.logo

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const rules = [
    { ok: next.length >= 8, label: 'At least 8 characters' },
    { ok: next.length > 0 && next !== current, label: 'Different from the temporary password' },
    { ok: next.length > 0 && next === confirm, label: 'Both entries match' },
  ]
  const valid = rules.every((r) => r.ok)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!valid) {
      setError('Please satisfy all the requirements below before continuing.')
      return
    }
    setLoading(true)
    try {
      const res = await api<{ ok: boolean; user: SessionUser }>('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next },
      })
      setUser(res.user)
      addToast({ type: 'success', title: 'Password updated', body: 'Your permanent password is set. Welcome aboard!' })
    } catch (err: any) {
      setError(err.message || 'Could not update the password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore — clearing local state is enough to leave the screen
    }
    setUser(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          {logo ? (
            <img src={logo} alt={`${schoolName} logo`} className="h-14 w-14 rounded-xl object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-lg shadow-brand/25">
              <GraduationCap className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
          <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-foreground">{schoolName}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-1 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">Security setup required</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Change Your Password</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You are signed in as the{' '}
            <span className="font-medium text-foreground">initial administrator</span>{' '}
            <span className="text-muted-foreground/80">({user?.email})</span> using a one-time temporary password.
            Set a permanent password now to activate the system — nothing else can be accessed until this is done.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" autoComplete="off">
            <div className="space-y-1.5">
              <Label htmlFor="fp-current">Temporary password</Label>
              <Input
                id="fp-current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Enter the temporary password"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-new">New permanent password</Label>
              <div className="relative">
                <Input
                  id="fp-new"
                  type={show ? 'text' : 'password'}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Choose a strong password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide new password' : 'Show new password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirm new password</Label>
              <Input
                id="fp-confirm"
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter the new password"
                required
              />
            </div>

            {/* Live requirement checklist */}
            <ul className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-xs" aria-label="Password requirements">
              {rules.map((r) => (
                <li key={r.label} className={cn('flex items-center gap-2', r.ok ? 'text-brand' : 'text-muted-foreground')}>
                  {r.ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                  {r.label}
                </li>
              ))}
            </ul>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading || !valid} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {loading ? 'Updating…' : 'Set permanent password'}
            </Button>
          </form>

          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out instead
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          For security, the temporary password is stored only as a scrypt hash and becomes unusable the moment your
          permanent password is saved.
        </p>
      </div>
    </div>
  )
}
