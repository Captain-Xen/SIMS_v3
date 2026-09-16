'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UserCheck, Plus, Loader2, X, LogOut, Printer, Trash2, Send, Mail, Phone,
  Clock, LogIn, UserX, Filter, ArrowRight,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Visitor } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const PURPOSES = ['Meeting', 'Delivery', 'Maintenance', 'Parent Visit', 'Other'] as const

const PURPOSE_STYLES: Record<string, string> = {
  Meeting: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
  Delivery: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  Maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  'Parent Visit': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  Other: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'CheckedIn', label: 'Checked In' },
  { id: 'CheckedOut', label: 'Checked Out' },
] as const

function purposeStyle(p: string) {
  return PURPOSE_STYLES[p] ?? PURPOSE_STYLES.Other
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
}

function isThisWeek(iso: string, ref: Date): boolean {
  const d = new Date(iso)
  const start = new Date(ref)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay()) // Sunday as start of week
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return d >= start && d < end
}

export function VisitorsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const settings = useAppStore((s) => s.settings)

  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const [adding, setAdding] = useState(false)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ visitors: Visitor[] }>('/api/visitors')
        if (!active) return
        setVisitors(res.visitors)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load visitors', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    const now = new Date()
    const checkedIn = visitors.filter((v) => v.status === 'CheckedIn').length
    const today = visitors.filter((v) => isSameDay(v.checkInTime, now)).length
    const checkedOutToday = visitors.filter(
      (v) => v.status === 'CheckedOut' && v.checkOutTime && isSameDay(v.checkOutTime, now)
    ).length
    const thisWeek = visitors.filter((v) => isThisWeek(v.checkInTime, now)).length
    return { checkedIn, today, checkedOutToday, thisWeek }
  }, [visitors])

  const filtered = useMemo(() => {
    if (tab === 'all') return visitors
    return visitors.filter((v) => v.status === tab)
  }, [visitors, tab])

  async function checkOut(v: Visitor) {
    setCheckingOut(v.id)
    try {
      await api(`/api/visitors/${v.id}`, { method: 'PATCH' })
      addToast({ type: 'success', title: 'Visitor checked out', body: `${v.name} has been checked out.` })
      const res = await api<{ visitors: Visitor[] }>('/api/visitors')
      setVisitors(res.visitors)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Check-out failed', body: e.message })
    } finally {
      setCheckingOut(null)
    }
  }

  async function removeVisitor(v: Visitor) {
    if (!confirm(`Delete visitor record for ${v.name}? This cannot be undone.`)) return
    setDeleting(v.id)
    try {
      await api(`/api/visitors/${v.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Record deleted', body: `${v.name}'s visit record was removed.` })
      setVisitors((prev) => prev.filter((x) => x.id !== v.id))
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  function onCheckedIn() {
    setAdding(false)
    ;(async () => {
      try {
        const res = await api<{ visitors: Visitor[] }>('/api/visitors')
        setVisitors(res.visitors)
      } catch { /* ignore */ }
    })()
  }

  function printGatePass(v: Visitor) {
    const school = escapeHtml(settings?.name || 'School Name')
    const w = window.open('', '_blank', 'width=520,height=720')
    if (!w) {
      addToast({ type: 'error', title: 'Popup blocked', body: 'Please allow popups to print the gate pass.' })
      return
    }
    const checkIn = new Date(v.checkInTime)
    const dateStr = checkIn.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = checkIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Gate Pass — ${escapeHtml(v.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #fff; }
    .pass { max-width: 480px; margin: 0 auto; border: 2px dashed var(--chart-1); border-radius: 14px; overflow: hidden; }
    .header { background: linear-gradient(135deg, var(--brand), #0d9488 60%, #0e7490); color: #fff; padding: 20px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }
    .header .sub { margin-top: 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; }
    .body { padding: 22px 24px; }
    .gp-no { display: inline-block; background: var(--brand-tint-faint); color: var(--brand-strong); font-weight: 700; padding: 6px 12px; border-radius: 8px; font-size: 13px; letter-spacing: 0.5px; border: 1px solid var(--brand-tint-soft); }
    .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
    .sign { display: flex; justify-content: space-between; margin-top: 22px; }
    .sign-box { flex: 1; text-align: center; }
    .sign-line { border-top: 1.5px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #475569; margin: 36px 12px 0; }
    .title { font-size: 18px; font-weight: 700; margin: 18px 0 4px; text-align: center; color: var(--brand-strong); text-transform: uppercase; letter-spacing: 1px; }
    @media print { body { padding: 0; } .pass { border: 2px dashed var(--chart-1); } }
  </style>
</head>
<body>
  <div class="pass">
    <div class="header">
      <h1>${school}</h1>
      <div class="sub">Visitor Gate Pass</div>
    </div>
    <div class="body">
      <div class="title">Gate Pass</div>
      <div style="text-align:center; margin-bottom: 14px;">
        <span class="gp-no">${escapeHtml(v.gatePassNo ?? '—')}</span>
      </div>
      <div class="row"><span class="label">Visitor Name</span><span class="value">${escapeHtml(v.name)}</span></div>
      <div class="row"><span class="label">Purpose</span><span class="value">${escapeHtml(v.purpose)}</span></div>
      <div class="row"><span class="label">Visiting</span><span class="value">${escapeHtml(v.visitingWhom ?? '—')}</span></div>
      ${v.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(v.phone)}</span></div>` : ''}
      ${v.email ? `<div class="row"><span class="label">Email</span><span class="value">${escapeHtml(v.email)}</span></div>` : ''}
      <div class="row"><span class="label">Check-In Date</span><span class="value">${escapeHtml(dateStr)}</span></div>
      <div class="row"><span class="label">Check-In Time</span><span class="value">${escapeHtml(timeStr)}</span></div>
      ${v.checkedInByName ? `<div class="row"><span class="label">Received By</span><span class="value">${escapeHtml(v.checkedInByName)}</span></div>` : ''}
      <div class="sign">
        <div class="sign-box"><div class="sign-line">Visitor Signature</div></div>
        <div class="sign-box"><div class="sign-line">Security Officer</div></div>
      </div>
    </div>
    <div class="footer">
      This pass must be carried at all times while on school premises and returned at check-out.
      &nbsp;·&nbsp; Generated ${escapeHtml(new Date().toLocaleString())}
    </div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`)
    w.document.close()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <UserCheck className="h-7 w-7" /> Visitor Management
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              Check in visitors, track gate passes, and manage visitor logs.
            </p>
          </div>
          <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <Plus className="h-4 w-4" /> Check In Visitor
          </Button>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={LogIn} label="Currently Checked In" value={String(stats.checkedIn)} sub="on premises" color="emerald" />
        <StatCard icon={UserCheck} label="Total Today" value={String(stats.today)} sub="visits today" color="teal" />
        <StatCard icon={LogOut} label="Checked Out Today" value={String(stats.checkedOutToday)} sub="departed today" color="amber" />
        <StatCard icon={Clock} label="Total This Week" value={String(stats.thisWeek)} sub="past 7 days" color="cyan" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              tab === t.id
                ? 'bg-brand text-brand-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            )}
          >
            {t.label}
            <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              tab === t.id ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground')}>
              {t.id === 'all' ? visitors.length : visitors.filter((v) => v.status === t.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <UserX className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                {tab === 'CheckedIn' ? 'No visitors currently checked in.' : tab === 'CheckedOut' ? 'No checked-out records.' : 'No visitor records yet.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="mt-2 border-brand/35 text-brand-strong hover:bg-brand/5">
                <Plus className="h-4 w-4" /> Check In Visitor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Visitor</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Purpose</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Visiting Whom</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Check-In</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Check-Out</th>
                    <th className="p-3 text-left font-medium">Gate Pass</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => {
                    const isCheckedIn = v.status === 'CheckedIn'
                    return (
                      <tr key={v.id} className="border-b border-border transition hover:bg-muted/40">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{v.name}</span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {v.phone && (
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {v.phone}</span>
                              )}
                              {v.email && (
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {v.email}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden p-3 sm:table-cell">
                          <span className={cn('inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold', purposeStyle(v.purpose))}>
                            {v.purpose}
                          </span>
                        </td>
                        <td className="hidden p-3 text-sm md:table-cell">{v.visitingWhom ?? '—'}</td>
                        <td className="hidden p-3 lg:table-cell">
                          <div className="text-sm">{fmtTime(v.checkInTime)}</div>
                          <div className="text-xs text-muted-foreground">{timeAgo(v.checkInTime)}</div>
                        </td>
                        <td className="hidden p-3 lg:table-cell">
                          {v.checkOutTime ? (
                            <div className="text-sm">{fmtTime(v.checkOutTime)}</div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="border-brand/35 font-mono text-[11px] text-brand-strong dark:border-brand/50 dark:text-brand">
                            {v.gatePassNo ?? '—'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-strong dark:bg-brand/15 dark:text-brand">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                              </span>
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              Checked Out
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {isCheckedIn && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Print gate pass"
                                onClick={() => printGatePass(v)}
                              >
                                <Printer className="h-4 w-4 text-brand" />
                              </Button>
                            )}
                            {isCheckedIn && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                disabled={checkingOut === v.id}
                                onClick={() => checkOut(v)}
                              >
                                {checkingOut === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                                <span className="hidden sm:inline">Check Out</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              title="Delete record"
                              disabled={deleting === v.id}
                              onClick={() => removeVisitor(v)}
                            >
                              {deleting === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {adding && <CheckInDialog onClose={() => setAdding(false)} onSaved={onCheckedIn} />}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-brand/5 to-brand/5 transition group-hover:from-brand/10 group-hover:to-brand/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-brand dark:text-brand">{sub}</p>
      </CardContent>
    </Card>
  )
}

function CheckInDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [purpose, setPurpose] = useState<string>('Meeting')
  const [visitingWhom, setVisitingWhom] = useState('')

  async function save() {
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Name required', body: 'Please enter the visitor name.' })
      return
    }
    setSaving(true)
    try {
      const res = await api<{ ok: boolean; id: string; gatePassNo: string }>('/api/visitors', {
        method: 'POST',
        body: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          purpose,
          visitingWhom: visitingWhom.trim(),
        },
      })
      addToast({
        type: 'success',
        title: 'Visitor checked in',
        body: `${name.trim()} has been checked in. Gate Pass: ${res.gatePassNo}`,
      })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Check-in failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-brand" /> Check In Visitor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visitor Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Smith" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="876-555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purpose of Visit</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visiting Whom</Label>
            <Input value={visitingWhom} onChange={(e) => setVisitingWhom(e.target.value)} placeholder="e.g. Mr. Brown (Principal)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
