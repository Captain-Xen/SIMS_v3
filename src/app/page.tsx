'use client'

import { useEffect, useState } from 'react'
import { useAppStore, applyTheme } from '@/lib/store'
import { api } from '@/lib/api'
import { LoginScreen } from '@/components/app/login-screen'
import { AppShell } from '@/components/app/app-shell'
import { Loader2 } from 'lucide-react'
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
          setSettings(settingsRes.settings)
          // apply accent color if set
          applyAccent(settingsRes.settings.accent)
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

  if (booting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading EduCenterJM...</p>
      </div>
    )
  }

  return user ? <AppShell /> : <LoginScreen />
}

// Apply the saved accent color as CSS variables (r,g,b|r,g,b|r,g,b)
function applyAccent(accent: string) {
  if (typeof document === 'undefined') return
  const parts = accent.split('|')
  if (parts.length < 3) return
  const [accentRgb, hoverRgb, ringRgb] = parts
  const root = document.documentElement
  root.style.setProperty('--accent', accentRgb)
  root.style.setProperty('--accent-hover', hoverRgb)
  root.style.setProperty('--ring', ringRgb)
}
