'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Settings as SettingsIcon, Save, Upload, Trash2, Loader2, Palette, Mail, Phone, MapPin,
  School, Image as ImageIcon, AlertTriangle, CheckCircle2, RotateCcw, EyeOff,
} from 'lucide-react'
import { api, resizeImageToDataUrl } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SchoolSettings, ViewId } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { HIDEABLE_FEATURES } from '@/components/app/nav'
import { cn } from '@/lib/utils'

interface AccentDef {
  name: string
  label: string
  shades: [string, string, string] // three "r,g,b" strings (primary/secondary/tertiary)
  swatch: string // CSS color for the swatch button
}

const ACCENTS: AccentDef[] = [
  { name: 'emerald', label: 'Emerald', shades: ['16,185,129', '20,184,166', '13,148,136'], swatch: '#10b981' },
  { name: 'green', label: 'Green', shades: ['22,163,74', '34,197,94', '21,128,61'], swatch: '#22c55e' },
  { name: 'lime', label: 'Lime', shades: ['132,204,22', '163,230,53', '101,163,13'], swatch: '#84cc16' },
  { name: 'yellow', label: 'Yellow', shades: ['234,179,8', '250,204,21', '202,138,4'], swatch: '#eab308' },
  { name: 'amber', label: 'Amber', shades: ['217,119,6', '245,158,11', '180,83,9'], swatch: '#d97706' },
  { name: 'orange', label: 'Orange', shades: ['234,88,12', '249,115,22', '194,65,12'], swatch: '#ea580c' },
  { name: 'red', label: 'Red', shades: ['220,38,38', '239,68,68', '185,28,28'], swatch: '#dc2626' },
  { name: 'rose', label: 'Rose', shades: ['225,29,72', '244,63,94', '190,18,60'], swatch: '#e11d48' },
  { name: 'pink', label: 'Pink', shades: ['219,39,119', '236,72,153', '190,24,93'], swatch: '#db2777' },
  { name: 'purple', label: 'Purple', shades: ['147,51,234', '168,85,247', '126,34,206'], swatch: '#9333ea' },
  { name: 'violet', label: 'Violet', shades: ['124,58,237', '139,92,246', '109,40,217'], swatch: '#7c3aed' },
  { name: 'indigo', label: 'Indigo', shades: ['79,70,229', '99,102,241', '67,56,202'], swatch: '#4f46e5' },
  { name: 'blue', label: 'Blue', shades: ['29,78,216', '59,130,246', '30,64,175'], swatch: '#1d4ed8' },
  { name: 'cyan', label: 'Cyan', shades: ['8,145,178', '6,182,212', '14,116,144'], swatch: '#0891b2' },
  { name: 'teal', label: 'Teal', shades: ['13,148,136', '20,184,166', '15,118,110'], swatch: '#0d9488' },
  { name: 'slate', label: 'Slate', shades: ['51,65,85', '71,85,105', '30,41,59'], swatch: '#334155' },
]

export function SettingsView() {
  const addToast = useAppStore((s) => s.addToast)
  const setSettings = useAppStore((s) => s.setSettings)
  const storeSettings = useAppStore((s) => s.settings)

  const [settings, setLocal] = useState<SchoolSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingBranding, setSavingBranding] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ settings: SchoolSettings | null }>('/api/settings')
        if (!active) return
        const s = res.settings ?? {
          name: 'EduCenterJM', tagline: 'Excellence in Education', logo: null,
          accent: '16,185,129|20,184,166|13,148,136', email: '', phone: '', address: '',
          features: {}, version: 1,
        }
        setLocal(s)
        if (!storeSettings) setSettings(s)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load settings', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  function patchLocal(patch: Partial<SchoolSettings>) {
    setLocal((prev) => prev ? { ...prev, ...patch } : prev)
  }

  async function saveBranding() {
    if (!settings) return
    setSavingBranding(true)
    try {
      const res = await api<{ settings: SchoolSettings }>('/api/settings', {
        method: 'PATCH',
        body: { name: settings.name, tagline: settings.tagline },
      })
      setLocal(res.settings)
      setSettings(res.settings)
      addToast({ type: 'success', title: 'Branding saved', body: 'School name and tagline updated.' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSavingBranding(false)
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    try {
      // Downscale client-side so the stored logo stays a small data URL.
      const dataUrl = await resizeImageToDataUrl(file, 320, 0.9)
      const res = await api<{ logo: string }>('/api/upload', { method: 'POST', body: { dataUrl, kind: 'logo' } })
      const next = { ...(settings as SchoolSettings), logo: res.logo }
      setLocal(next)
      setSettings(next)
      addToast({ type: 'success', title: 'Logo uploaded' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Upload failed', body: e.message })
    } finally {
      setUploading(false)
    }
  }

  async function removeLogo() {
    if (!confirm('Remove the school logo?')) return
    setUploading(true)
    try {
      await api('/api/upload', { method: 'DELETE', body: { kind: 'logo' } })
      const next = { ...(settings as SchoolSettings), logo: null }
      setLocal(next)
      setSettings(next)
      addToast({ type: 'success', title: 'Logo removed' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Remove failed', body: e.message })
    } finally {
      setUploading(false)
    }
  }

  async function applyAccent(a: AccentDef) {
    if (!settings) return
    const accent = a.shades.join('|')
    patchLocal({ accent })
    try {
      const res = await api<{ settings: SchoolSettings }>('/api/settings', { method: 'PATCH', body: { accent } })
      setLocal(res.settings)
      setSettings(res.settings)
      addToast({ type: 'success', title: 'Color updated', body: `${a.label} theme applied.` })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    }
  }

  async function toggleFeature(id: ViewId, label: string, enabled: boolean) {
    if (!settings) return
    const prevFeatures = settings.features
    const features = { ...prevFeatures, [id]: enabled }
    patchLocal({ features }) // optimistic
    try {
      const res = await api<{ settings: SchoolSettings }>('/api/settings', {
        method: 'PATCH',
        body: { features },
      })
      setLocal(res.settings)
      setSettings(res.settings)
      addToast({
        type: 'success',
        title: enabled ? 'Feature visible' : 'Feature hidden',
        body: `"${label}" is now ${enabled ? 'shown to' : 'removed from'} every role's navigation.`,
      })
    } catch (e: any) {
      patchLocal({ features: prevFeatures }) // revert
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    }
  }

  async function saveContact() {
    if (!settings) return
    setSavingContact(true)
    try {
      const res = await api<{ settings: SchoolSettings }>('/api/settings', {
        method: 'PATCH',
        body: { email: settings.email, phone: settings.phone, address: settings.address },
      })
      setLocal(res.settings)
      setSettings(res.settings)
      addToast({ type: 'success', title: 'Contact info saved' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSavingContact(false)
    }
  }

  async function resetDemo() {
    if (!confirm('Reset all demo data? This will reseed the database and cannot be undone.')) return
    setResetting(true)
    try {
      await api('/api/seed', { method: 'POST' })
      addToast({ type: 'success', title: 'Demo data reset', body: 'The database has been reseeded.' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Reset failed', body: e.message })
    } finally {
      setResetting(false)
    }
  }

  const activeAccent = ACCENTS.find((a) => settings?.accent === a.shades.join('|'))
  const hiddenCount = HIDEABLE_FEATURES.filter((f) => settings?.features?.[f.id] === false).length

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center p-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><School className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">School Branding</CardTitle>
              <CardDescription>Name, tagline, and logo shown across the app — changes go live for every user</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">School Name</Label>
              <Input value={settings.name} onChange={(e) => patchLocal({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tagline</Label>
              <Input value={settings.tagline} onChange={(e) => patchLocal({ tagline: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Logo</Label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {settings.logo ? (
                  <img src={settings.logo} alt="School logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload Logo
                </Button>
                {settings.logo && (
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" disabled={uploading} onClick={removeLogo}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
              </div>
            </div>
          </div>

          <Button onClick={saveBranding} disabled={savingBranding} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {savingBranding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Branding
          </Button>
        </CardContent>
      </Card>

      {/* Color scheme */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><Palette className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Color Scheme</CardTitle>
              <CardDescription>Pick an accent color for the app theme</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            {activeAccent ? (
              <>
                <span className="h-4 w-4 rounded-full" style={{ background: activeAccent.swatch }} />
                <span className="text-sm font-medium">Current theme: <span className="text-brand">{activeAccent.label}</span></span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Current theme: Custom</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {ACCENTS.map((a) => {
              const selected = settings.accent === a.shades.join('|')
              return (
                <button
                  key={a.name}
                  onClick={() => applyAccent(a)}
                  title={a.label}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition',
                    selected ? 'border-brand/60 ring-2 ring-brand/30' : 'border-border hover:border-brand/35 hover:bg-muted/40',
                  )}
                >
                  <span className="h-8 w-8 rounded-full shadow-sm" style={{ background: a.swatch }} />
                  <span className="text-[10px] font-medium">{a.label}</span>
                  {selected && <CheckCircle2 className="absolute -right-1 -top-1 h-4 w-4 text-brand" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feature visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><EyeOff className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">Feature Visibility</CardTitle>
              <CardDescription>Hide or show entire modules for every role — updates go live for all users</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <span className="text-sm font-medium">
              {HIDEABLE_FEATURES.length - hiddenCount} of {HIDEABLE_FEATURES.length} modules visible
            </span>
            <span className="text-xs text-muted-foreground">
              Everyone sees changes within ~45s, or instantly when they refocus the app. Dashboard, Profile, Notifications, Help and Settings stay on.
            </span>
          </div>
          <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {HIDEABLE_FEATURES.map((f) => {
              const enabled = settings.features?.[f.id] !== false
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.roles.length === 0 ? 'All roles' : f.roles.join(', ')}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleFeature(f.id, f.label, v)}
                    aria-label={`${enabled ? 'Hide' : 'Show'} ${f.label}`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"><Mail className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base">School Contact</CardTitle>
              <CardDescription>Public contact information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={settings.email} onChange={(e) => patchLocal({ email: e.target.value })} className="pl-10" placeholder="info@educenterjm.edu" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={settings.phone} onChange={(e) => patchLocal({ phone: e.target.value })} className="pl-10" placeholder="+1 876 555 0100" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea value={settings.address} onChange={(e) => patchLocal({ address: e.target.value })} rows={2} className="pl-10" placeholder="123 Knowledge Way, Kingston, Jamaica" />
            </div>
          </div>
          <Button onClick={saveContact} disabled={savingContact} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Contact
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-rose-300 dark:border-rose-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-base text-rose-700 dark:text-rose-300">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Reset Demo Data</p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">Reseeds the entire database with fresh demo content. All custom changes will be lost.</p>
            </div>
            <Button variant="destructive" onClick={resetDemo} disabled={resetting}>
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
