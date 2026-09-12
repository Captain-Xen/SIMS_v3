'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HeartPulse, Plus, Search, Trash2, Pencil, Loader2, X, Send,
  AlertTriangle, Pill, Syringe, Stethoscope, ShieldAlert, CalendarClock,
  User as UserIcon, ArrowRight, FileHeart, Activity,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { HealthRecord, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

// ---- Type / severity styling ---------------------------------------------
type TypeKey = 'Allergy' | 'Condition' | 'Medication' | 'Immunization' | 'ClinicVisit'

const TYPE_META: Record<TypeKey, { label: string; badge: string; icon: any; tint: string }> = {
  Allergy: {
    label: 'Allergy',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    icon: ShieldAlert,
    tint: 'bg-rose-500',
  },
  Condition: {
    label: 'Condition',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    icon: Activity,
    tint: 'bg-amber-500',
  },
  Medication: {
    label: 'Medication',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    icon: Pill,
    tint: 'bg-teal-500',
  },
  Immunization: {
    label: 'Immunization',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: Syringe,
    tint: 'bg-emerald-500',
  },
  ClinicVisit: {
    label: 'Clinic Visit',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    icon: Stethoscope,
    tint: 'bg-cyan-500',
  },
}

const TYPE_KEYS = Object.keys(TYPE_META) as TypeKey[]

const SEVERITY_BADGE: Record<string, string> = {
  Critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  Moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
}

const FILTER_TABS: { key: string; label: string; type?: TypeKey }[] = [
  { key: 'all', label: 'All' },
  { key: 'Allergy', label: 'Allergies', type: 'Allergy' },
  { key: 'Condition', label: 'Conditions', type: 'Condition' },
  { key: 'Medication', label: 'Medications', type: 'Medication' },
  { key: 'Immunization', label: 'Immunizations', type: 'Immunization' },
  { key: 'ClinicVisit', label: 'Clinic Visits', type: 'ClinicVisit' },
]

const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical']

const ALLOWED_ROLES = ['Admin', 'Principal', 'Nurse']

export function HealthView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [records, setRecords] = useState<HealthRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<HealthRecord | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const canManage = ALLOWED_ROLES.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [hRes, sRes] = await Promise.all([
          api<{ records: HealthRecord[] }>('/api/health'),
          api<{ students: Student[] }>('/api/students'),
        ])
        if (!active) return
        setRecords(hRes.records)
        setStudents(sRes.students)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load health records', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  // Derived summary stats
  const stats = useMemo(() => {
    const byType = (t: string) => records.filter((r) => r.type === t).length
    const criticalAllergies = records.filter((r) => r.type === 'Allergy' && r.severity === 'Critical').length
    return {
      total: records.length,
      allergies: byType('Allergy'),
      medications: byType('Medication'),
      immunizations: byType('Immunization'),
      criticalAllergies,
    }
  }, [records])

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((r) => {
      if (filter !== 'all' && r.type !== filter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.recordedByName ?? '').toLowerCase().includes(q)
      )
    })
  }, [records, search, filter])

  async function refresh() {
    try {
      const hRes = await api<{ records: HealthRecord[] }>('/api/health')
      setRecords(hRes.records)
    } catch { /* ignore */ }
  }

  async function onDelete(r: HealthRecord) {
    if (!confirm(`Delete "${r.title}" for ${r.studentName}? This cannot be undone.`)) return
    setDeleting(r.id)
    try {
      await api(`/api/health/${r.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Record deleted', body: `"${r.title}" was removed.` })
      await refresh()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
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
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <HeartPulse className="h-7 w-7" /> Health Records
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Student medical information, allergies, and clinic visits.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setAdding(true)}
              variant="secondary"
              className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileHeart} label="Total Records" value={String(stats.total)} sub="all entries" color="emerald" />
        <StatCard
          icon={ShieldAlert}
          label="Critical Allergies"
          value={String(stats.criticalAllergies)}
          sub={`${stats.allergies} total allergies`}
          color={stats.criticalAllergies > 0 ? 'red' : 'slate'}
        />
        <StatCard icon={Pill} label="Active Medications" value={String(stats.medications)} sub="on file" color="teal" />
        <StatCard icon={Syringe} label="Immunizations" value={String(stats.immunizations)} sub="recorded" color="cyan" />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filter tabs + search */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((t) => {
                const active = filter === t.key
                const count =
                  t.key === 'all'
                    ? records.length
                    : records.filter((r) => r.type === t.type).length
                return (
                  <button
                    key={t.key}
                    onClick={() => setFilter(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-border bg-card text-muted-foreground hover:border-emerald-300 hover:text-foreground'
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records…"
                className="pl-9"
              />
            </div>
          </div>

          {/* Records list */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
                <HeartPulse className="h-10 w-10 opacity-40" />
                <p className="text-sm">
                  {records.length === 0
                    ? 'No health records on file yet.'
                    : 'No records match your filter.'}
                </p>
                {canManage && records.length === 0 && (
                  <Button size="sm" onClick={() => setAdding(true)} className="mt-1 bg-emerald-600 text-white hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Add the first record
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((r) => {
                const meta = TYPE_META[(r.type as TypeKey) ?? 'Allergy'] ?? TYPE_META.Allergy
                const sev = SEVERITY_BADGE[r.severity] ?? SEVERITY_BADGE.Low
                const Icon = meta.icon
                return (
                  <Card key={r.id} className="overflow-hidden transition hover:shadow-md">
                    <div className={cn('h-1.5 w-full', meta.tint)} />
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Student identity */}
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <UserAvatar name={r.studentName} avatar={null} role="Student" size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold leading-snug">{r.title}</h3>
                              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.badge)}>
                                <Icon className="h-3 w-3" /> {meta.label}
                              </span>
                              <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', sev)}>
                                {r.severity}
                              </span>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3" /> {r.studentName}
                            </p>
                            {r.description && (
                              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {r.date && (
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {r.recordedByName && (
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" /> by {r.recordedByName}
                                </span>
                              )}
                              <span>· added {timeAgo(r.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditing(r)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                              onClick={() => onDelete(r)}
                              disabled={deleting === r.id}
                              title="Delete"
                            >
                              {deleting === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
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

      {(adding || editing) && (
        <HealthRecordDialog
          record={editing}
          students={students}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={async () => {
            setAdding(false)
            setEditing(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon, label, value, sub, color,
}: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition group-hover:from-emerald-500/10 group-hover:to-teal-500/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Add / Edit Dialog
// ---------------------------------------------------------------------------
function HealthRecordDialog({
  record, students, onClose, onSaved,
}: {
  record: HealthRecord | null
  students: Student[]
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState(record?.studentId ?? '')
  const [type, setType] = useState<TypeKey>((record?.type as TypeKey) ?? 'Allergy')
  const [title, setTitle] = useState(record?.title ?? '')
  const [description, setDescription] = useState(record?.description ?? '')
  const [severity, setSeverity] = useState(record?.severity ?? 'Low')
  const [date, setDate] = useState(record?.date ?? '')
  const [studentSearch, setStudentSearch] = useState('')

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admissionNo ?? '').toLowerCase().includes(q) ||
        (s.className ?? '').toLowerCase().includes(q)
    )
  }, [students, studentSearch])

  const selectedStudent = students.find((s) => s.id === studentId) ?? null

  async function save() {
    if (!studentId) {
      addToast({ type: 'warning', title: 'Select a student', body: 'Please pick the student this record is for.' })
      return
    }
    if (!title.trim()) {
      addToast({ type: 'warning', title: 'Title required', body: 'Please enter a short title for the record.' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        studentId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        severity,
        date: date || null,
      }
      if (record) {
        await api(`/api/health/${record.id}`, { method: 'PATCH', body: payload })
        addToast({ type: 'success', title: 'Record updated', body: `"${title.trim()}" was saved.` })
      } else {
        await api('/api/health', { method: 'POST', body: payload })
        addToast({ type: 'success', title: 'Record added', body: `"${title.trim()}" was added.` })
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-600" />
            {record ? 'Edit Health Record' : 'Add Health Record'}
          </DialogTitle>
          <CardDescription>
            {record ? 'Update the medical record details below.' : 'Record a new allergy, condition, medication, immunization, or clinic visit.'}
          </CardDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student picker — searchable select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Student *
            </Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student…" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students…"
                      className="h-8 pl-8 text-xs"
                      // Prevent the select from closing when typing
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No students match.
                    </div>
                  ) : (
                    filteredStudents.slice(0, 100).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.admissionNo ? `${s.admissionNo} · ` : ''}{s.className ?? ''}
                          </span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </div>
              </SelectContent>
            </Select>
            {selectedStudent && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <UserAvatar name={selectedStudent.name} avatar={selectedStudent.avatar} role="Student" size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedStudent.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedStudent.admissionNo ?? '—'} · {selectedStudent.className ?? '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as TypeKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_KEYS.map((k) => {
                    const m = TYPE_META[k]
                    const Icon = m.icon
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" /> {m.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Peanut allergy, Asthma inhaler, Tetanus booster…"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description / Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Reaction, dosage, prescribed by, follow-up notes, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {record ? 'Save Changes' : 'Add Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
