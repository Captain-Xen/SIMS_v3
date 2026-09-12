'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarRange, Plus, Pencil, Trash2, CalendarDays, Clock, Sun, BookOpen,
  Loader2, X, Send, CheckCircle2, ArrowRight, Calendar as CalendarIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Term } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STAFF_CAN_MANAGE = ['Admin', 'Principal', 'Teacher']

interface HolidayRow { date: string; name: string }
interface ExamWeekRow { startDate: string; endDate: string; name: string }

function fmtDateRange(s: string, e: string): string {
  const sd = new Date(s)
  const ed = new Date(e)
  const sStr = sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const eStr = ed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${sStr} – ${eStr}`
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysBetween(s: string, e: string): number {
  const start = new Date(s).getTime()
  const end = new Date(e).getTime()
  return Math.max(0, Math.round((end - start) / 86400000))
}

function termProgress(term: Term): number {
  const now = Date.now()
  const start = new Date(term.startDate).getTime()
  const end = new Date(term.endDate).getTime()
  if (now <= start) return 0
  if (now >= end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
}

export function TermsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Term | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ terms: Term[] }>('/api/terms')
        if (!active) return
        setTerms(res.terms)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load terms', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    const totalHolidays = terms.reduce((a, t) => a + (t.holidays?.length ?? 0), 0)
    const totalExamWeeks = terms.reduce((a, t) => a + (t.examWeeks?.length ?? 0), 0)
    const active = terms.find((t) => t.isActive)
    return { total: terms.length, active, totalHolidays, totalExamWeeks }
  }, [terms])

  async function refresh() {
    try {
      const res = await api<{ terms: Term[] }>('/api/terms')
      setTerms(res.terms)
    } catch { /* ignore */ }
  }

  async function onDelete(t: Term) {
    if (!confirm(`Delete term "${t.name}"? This cannot be undone.`)) return
    setDeleting(t.id)
    try {
      await api(`/api/terms/${t.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Term deleted', body: `"${t.name}" was removed.` })
      await refresh()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  function onSaved() {
    setAdding(false)
    setEditing(null)
    refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <CalendarRange className="h-7 w-7" /> Terms &amp; Calendar
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Manage academic terms, holidays, and exam weeks.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Add Term
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarRange} label="Total Terms" value={String(stats.total)} sub="configured" color="emerald" />
        <StatCard icon={CheckCircle2} label="Active Term" value={stats.active ? stats.active.name : 'None'} sub={stats.active ? 'in progress' : 'not set'} color="teal" />
        <StatCard icon={Sun} label="Total Holidays" value={String(stats.totalHolidays)} sub="scheduled" color="amber" />
        <StatCard icon={BookOpen} label="Exam Weeks" value={String(stats.totalExamWeeks)} sub="planned" color="cyan" />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active term banner */}
          {stats.active && (
            <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Active Term</Badge>
                    </div>
                    <h3 className="mt-2 font-serif text-xl font-bold">{stats.active.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {fmtDateRange(stats.active.startDate, stats.active.endDate)} · {daysBetween(stats.active.startDate, stats.active.endDate)} days
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{termProgress(stats.active)}%</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">complete</p>
                  </div>
                </div>
                <Progress value={termProgress(stats.active)} className="mt-4 h-2" />
              </CardContent>
            </Card>
          )}

          {/* Terms list */}
          {terms.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-3 p-0 text-muted-foreground">
                <CalendarRange className="h-10 w-10 opacity-40" />
                <p className="text-sm">No terms configured yet.</p>
                {canManage && (
                  <Button onClick={() => setAdding(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Add First Term
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {terms.map((t) => {
                const progress = termProgress(t)
                const isDel = deleting === t.id
                return (
                  <Card key={t.id} className={cn('overflow-hidden transition hover:shadow-md', t.isActive && 'ring-1 ring-emerald-300 dark:ring-emerald-700')}>
                    <div className={cn('h-1.5 w-full', t.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')} />
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-lg font-bold leading-snug">{t.name}</h3>
                            {t.isActive && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <span className="relative mr-1 flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" /> {fmtDateRange(t.startDate, t.endDate)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> {daysBetween(t.startDate, t.endDate)} days duration
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40" onClick={() => onDelete(t)} disabled={isDel} title="Delete">
                              {isDel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Mini progress for in-progress non-active terms */}
                      {progress > 0 && progress < 100 && !t.isActive && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                            <span>In progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      )}

                      {/* Holidays */}
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Sun className="h-3.5 w-3.5 text-amber-500" /> Holidays ({t.holidays?.length ?? 0})
                        </p>
                        {!t.holidays || t.holidays.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70">No holidays scheduled.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {t.holidays.map((h, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                                <CalendarIcon className="h-3 w-3" />
                                {fmtDate(h.date)} · {h.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Exam weeks */}
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5 text-rose-500" /> Exam Weeks ({t.examWeeks?.length ?? 0})
                        </p>
                        {!t.examWeeks || t.examWeeks.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70">No exam weeks scheduled.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {t.examWeeks.map((w, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                                <BookOpen className="h-3 w-3" />
                                {fmtDateRange(w.startDate, w.endDate)} · {w.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {adding && <TermDialog onClose={() => setAdding(false)} onSaved={onSaved} />}
      {editing && <TermDialog term={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

function TermDialog({ term, onClose, onSaved }: { term?: Term; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(term?.name ?? '')
  const [startDate, setStartDate] = useState(term?.startDate?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(term?.endDate?.slice(0, 10) ?? '')
  const [isActive, setIsActive] = useState(term?.isActive ?? false)
  const [holidays, setHolidays] = useState<HolidayRow[]>(
    term?.holidays?.map((h) => ({ date: h.date.slice(0, 10), name: h.name })) ?? []
  )
  const [examWeeks, setExamWeeks] = useState<ExamWeekRow[]>(
    term?.examWeeks?.map((w) => ({ startDate: w.startDate.slice(0, 10), endDate: w.endDate.slice(0, 10), name: w.name })) ?? []
  )

  function addHoliday() { setHolidays((h) => [...h, { date: '', name: '' }]) }
  function updateHoliday(i: number, patch: Partial<HolidayRow>) {
    setHolidays((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  function removeHoliday(i: number) { setHolidays((h) => h.filter((_, idx) => idx !== i)) }

  function addExamWeek() { setExamWeeks((w) => [...w, { startDate: '', endDate: '', name: '' }]) }
  function updateExamWeek(i: number, patch: Partial<ExamWeekRow>) {
    setExamWeeks((w) => w.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }
  function removeExamWeek(i: number) { setExamWeeks((w) => w.filter((_, idx) => idx !== i)) }

  async function save() {
    if (!name.trim() || !startDate || !endDate) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please enter a name, start date, and end date.' })
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      addToast({ type: 'warning', title: 'Invalid dates', body: 'End date must be on or after start date.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        startDate,
        endDate,
        isActive,
        holidays: holidays.filter((h) => h.date && h.name.trim()),
        examWeeks: examWeeks.filter((w) => w.startDate && w.endDate && w.name.trim()),
      }
      if (term) {
        await api(`/api/terms/${term.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Term updated', body: `"${name.trim()}" was saved.` })
      } else {
        await api('/api/terms', { method: 'POST', body })
        addToast({ type: 'success', title: 'Term added', body: `"${name.trim()}" was created.` })
      }
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-emerald-600" /> {term ? 'Edit Term' : 'Add Term'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Michaelmas Term 2025" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-600"
            />
            <div>
              <p className="text-sm font-medium">Set as active term</p>
              <p className="text-xs text-muted-foreground">Other terms will be deactivated automatically.</p>
            </div>
          </label>

          <Separator />

          {/* Holidays */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold"><Sun className="h-4 w-4 text-amber-500" /> Holidays</p>
                <p className="text-xs text-muted-foreground">Public holidays and breaks during this term.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addHoliday}>
                <Plus className="h-3.5 w-3.5" /> Add Holiday
              </Button>
            </div>
            {holidays.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No holidays added.</p>
            ) : (
              <div className="space-y-2">
                {holidays.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input type="date" value={h.date} onChange={(e) => updateHoliday(i, { date: e.target.value })} className="w-auto" />
                    <Input value={h.name} onChange={(e) => updateHoliday(i, { name: e.target.value })} placeholder="Holiday name (e.g. Independence Day)" className="min-w-[180px] flex-1" />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-rose-600 hover:bg-rose-50" onClick={() => removeHoliday(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Exam weeks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold"><BookOpen className="h-4 w-4 text-rose-500" /> Exam Weeks</p>
                <p className="text-xs text-muted-foreground">Assessment periods within this term.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addExamWeek}>
                <Plus className="h-3.5 w-3.5" /> Add Exam Week
              </Button>
            </div>
            {examWeeks.length === 0 ? (
              <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">No exam weeks added.</p>
            ) : (
              <div className="space-y-2">
                {examWeeks.map((w, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Input value={w.name} onChange={(e) => updateExamWeek(i, { name: e.target.value })} placeholder="Exam week name (e.g. Midterm Exams)" className="flex-1" />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-rose-600 hover:bg-rose-50" onClick={() => removeExamWeek(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="date" value={w.startDate} onChange={(e) => updateExamWeek(i, { startDate: e.target.value })} className="flex-1" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="date" value={w.endDate} onChange={(e) => updateExamWeek(i, { endDate: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {term ? 'Save Changes' : 'Add Term'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
