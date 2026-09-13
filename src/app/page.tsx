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

  if (booting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand/10 via-brand/10 to-brand/10 dark:from-slate-950 dark:via-slate-900 dark:to-brand/10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-lg shadow-brand/30">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading EduCenterJM...</p>
      </div>
    )
  }

  return user ? <AppShell /> : <LoginScreen />
}
