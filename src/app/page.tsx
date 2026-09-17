'use client'

import { useEffect, useState } from 'react'
import { useAppStore, applyTheme } from '@/lib/store'
import { api } from '@/lib/api'
import { LoginScreen } from '@/components/app/login-screen'
import { AppShell } from '@/components/app/app-shell'
import { ForceChangePassword } from '@/components/app/force-change-password'
import { Loader2, GraduationCap } from 'lucide-react'
import type { SessionUser, SchoolSettings } from '@/lib/types'

export default function Home() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setSettings = useAppStore((s) => s.setSettings)
  const theme = useAppStore((s) => s.theme)
  const [booting, setBooting] = useState(true)

  // Apply theme on mount + whenever it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Bootstrap: fetch session + settings
  useEffect(() => {
    let active = true
    async function boot() {
      try {
        const [meRes, settingsRes] = await Promise.all([
          api<{ user: SessionUser | null }>('/api/auth/me'),
          api<{ settings: SchoolSettings | null }>('/api/settings'),
        ])
        if (!active) return
        if (meRes.user) setUser(meRes.user)
        if (settingsRes.settings) {
          // setSettings applies the saved accent via applyAccentVars (see lib/store)
          setSettings(settingsRes.settings)
        }
      } catch {
        // ignore — treat as logged out
      } finally {
        if (active) setBooting(false)
      }
    }
    boot()
    return () => { active = false }
  }, [setUser, setSettings])

  // Live-sync: poll the tiny settings version endpoint (~15 bytes). When the
  // version moves (admin changed theme / feature visibility / branding), fetch
  // the full settings once and push them through the store — every screen,
  // role, and tab re-skins instantly. Gated on tab visibility + instant on focus.
  useEffect(() => {
    let active = true
    let checking = false
    async function check() {
      if (checking || document.hidden) return
      checking = true
      try {
        const current = useAppStore.getState().settings?.version ?? 0
        const res = await api<{ version: number }>('/api/settings', { query: { mode: 'version' } })
        if (active && res.version !== current) {
          const full = await api<{ settings: SchoolSettings | null }>('/api/settings')
          if (active && full.settings) setSettings(full.settings)
        }
      } catch {
        // offline / transient — retry on next tick
      } finally {
        checking = false
      }
    }
    const wake = () => { check() }
    const onVisible = () => { if (!document.hidden) wake() }
    const t = setInterval(check, 45_000)
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      clearInterval(t)
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [setSettings])

  if (booting) {
    // Centered boot splash — neutral "Loading" (the school name may not be
    // known yet, and a spinning loader communicates progress better).
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background" role="status" aria-label="Loading">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-lg shadow-brand/30">
          <GraduationCap className="h-8 w-8" aria-hidden="true" />
          <span className="absolute inset-0 rounded-2xl animate-pulse-ring" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
          <span>Loading</span>
        </div>
      </div>
    )
  }

  if (user) {
    // Backend-enforced: while mustChangePassword is true every data endpoint
    // returns 401, so the app renders ONLY the mandatory password-change
    // screen (no dashboard escape hatch).
    return user.mustChangePassword ? <ForceChangePassword /> : <AppShell />
  }
  return <LoginScreen />
}
