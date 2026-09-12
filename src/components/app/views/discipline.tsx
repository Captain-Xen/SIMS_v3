'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Gavel, AlertTriangle, Ban, Loader2, Send, ShieldAlert, ShieldCheck, User,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Discipline, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPES = ['Detention', 'Suspension', 'Warning'] as const

const TYPE_BADGE: Record<string, string> = {
  Detention: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Suspension: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  Warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
}

const TYPE_ICON: Record<string, any> = {
  Detention: AlertTriangle,
  Suspension: Ban,
  Warning: ShieldAlert,
}

export function DisciplineView() {
  const addToast = useAppStore((s) => s.addToast)
  const [records, setRecords] = useState<Discipline[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ studentId: '', type: 'Detention' as string, reason: '' })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [dRes, sRes] = await Promise.all([
          api<{ discipline: Discipline[] }>('/api/discipline'),
          api<{ students: Student[] }>('/api/students'),
        ])
        if (!active) return
        setRecords(dRes.discipline)
        setStudents(sRes.students.sort((a, b) => a.name.localeCompare(b.name)))
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load discipline records', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    const detentions = records.filter((r) => r.type === 'Detention').length
    const suspensions = records.filter((r) => r.type === 'Suspension').length
    const warnings = records.filter((r) => r.type === 'Warning').length
    // at-risk = students with >= 2 suspensions OR >= 5 detentions
    const byStudent = new Map<string, { detentions: number; suspensions: number }>()
    for (const r of records) {
      const cur = byStudent.get(r.studentId) ?? { detentions: 0, suspensions: 0 }
      if (r.type === 'Detention') cur.detentions++
      if (r.type === 'Suspension') cur.suspensions++
      byStudent.set(r.studentId, cur)
    }
    const atRisk = Array.from(byStudent.entries()).filter(([, v]) => v.suspensions >= 2 || v.detentions >= 5).length
    return { detentions, suspensions, warnings, atRisk }
  }, [records])

  async function submit() {
    if (!form.studentId || !form.reason.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Select a student and provide a reason.' })
      return
    }
    setSubmitting(true)
    try {
      await api('/api/discipline', { method: 'POST', body: { studentId: form.studentId, type: form.type, reason: form.reason.trim() } })
      addToast({ type: 'success', title: 'Discipline issued', body: `${form.type} recorded.` })
      setForm({ studentId: '', type: 'Detention', reason: '' })
      const dRes = await api<{ discipline: Discipline[] }>('/api/discipline')
      setRecords(dRes.discipline)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to issue', body: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><Gavel className="h-7 w-7" /> Discipline Module</h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">Track and manage student disciplinary actions.</p>
          </div>
        </CardContent>
      </Card>

      {/* Escalation callout */}
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Escalation Policy</p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
              Every <strong>3 detentions</strong> automatically escalates to <strong>1 suspension</strong>.
              Reaching <strong>4 suspensions</strong> results in automatic <strong>expulsion</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={AlertTriangle} label="Detentions" value={stats.detentions} color="amber" />
        <SummaryCard icon={Ban} label="Suspensions" value={stats.suspensions} color="rose" />
        <SummaryCard icon={ShieldAlert} label="Warnings" value={stats.warnings} color="yellow" />
        <SummaryCard icon={User} label="At-risk students" value={stats.atRisk} color="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Issue form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Gavel className="h-4 w-4 text-emerald-600" /> Issue Discipline</CardTitle>
            <CardDescription>Record a new disciplinary action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a student..." /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4} placeholder="Describe the incident..." />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Record Action
            </Button>
          </CardContent>
        </Card>

        {/* Records table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Discipline History</CardTitle>
            <CardDescription>{records.length} total record(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : records.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-10 w-10 text-emerald-500 opacity-60" />
                <p className="text-sm">No disciplinary records. Everyone is in good standing.</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="p-3 text-left font-medium">Student</th>
                      <th className="p-3 text-left font-medium">Type</th>
                      <th className="hidden p-3 text-left font-medium md:table-cell">Reason</th>
                      <th className="hidden p-3 text-left font-medium sm:table-cell">Issuer</th>
                      <th className="p-3 text-right font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const Icon = TYPE_ICON[r.type] ?? AlertTriangle
                      return (
                        <tr key={r.id} className="border-b border-border transition hover:bg-muted/40">
                          <td className="p-3 font-medium">{r.studentName}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={cn('border-transparent', TYPE_BADGE[r.type] ?? '')}>
                              <Icon className="mr-1 h-3 w-3" />
                              {r.type}
                            </Badge>
                          </td>
                          <td className="hidden max-w-xs p-3 text-muted-foreground md:table-cell"><span className="line-clamp-2">{r.reason}</span></td>
                          <td className="hidden p-3 text-muted-foreground sm:table-cell">{r.issuerName ?? 'System'}</td>
                          <td className="p-3 text-right text-xs text-muted-foreground">{timeAgo(r.date)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  }
  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110', colors[color])}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
