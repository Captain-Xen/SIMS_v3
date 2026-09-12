'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardPaste, Plus, Search, Eye, Trash2, Check, X, UserPlus, Loader2,
  Send, Mail, Phone, Home, GraduationCap, Calendar, ArrowRight, Inbox,
  CheckCircle2, PenLine, ShieldAlert, FileText, MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { api, gradeToForm, initials, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Admission } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const GRADES = [7, 8, 9, 10, 11, 12, 13]
const STATUS_FILTERS = ['All', 'Pending', 'Reviewing', 'Accepted', 'Rejected', 'Enrolled'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Pending':   return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
    case 'Reviewing': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300'
    case 'Accepted':  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
    case 'Rejected':  return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
    case 'Enrolled':  return 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
    default:          return 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
  }
}

export function AdmissionsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('All')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<Admission | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ admissions: Admission[] }>('/api/admissions')
        if (!active) return
        setAdmissions(res.admissions)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load admissions', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => ({
    total: admissions.length,
    pending: admissions.filter((a) => a.status === 'Pending').length,
    accepted: admissions.filter((a) => a.status === 'Accepted').length,
    enrolled: admissions.filter((a) => a.status === 'Enrolled').length,
  }), [admissions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return admissions.filter((a) => {
      if (filter !== 'All' && a.status !== filter) return false
      if (!q) return true
      return (
        a.applicantName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.parentName ?? '').toLowerCase().includes(q) ||
        (a.previousSchool ?? '').toLowerCase().includes(q)
      )
    })
  }, [admissions, filter, search])

  async function refresh() {
    try {
      const res = await api<{ admissions: Admission[] }>('/api/admissions')
      setAdmissions(res.admissions)
    } catch { /* ignore */ }
  }

  async function updateStatus(a: Admission, status: string) {
    setActingOn(a.id)
    try {
      await api(`/api/admissions/${a.id}`, { method: 'PATCH', body: { status } })
      addToast({
        type: status === 'Rejected' ? 'info' : 'success',
        title: `Application ${status.toLowerCase()}`,
        body: status === 'Enrolled' ? 'Student account created.' : undefined,
      })
      const res = await api<{ admissions: Admission[] }>('/api/admissions')
      setAdmissions(res.admissions)
      const updated = res.admissions.find((x) => x.id === a.id) ?? null
      setViewing(updated)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Action failed', body: e.message })
    } finally {
      setActingOn(null)
    }
  }

  // Quick inline status update from the table row. Enroll requires explicit
  // confirmation because it creates a student login account on the backend.
  function quickUpdateStatus(a: Admission, status: string) {
    if (status === 'Enrolled') {
      if (!confirm(`Enroll ${a.applicantName}? This will CREATE A STUDENT LOGIN ACCOUNT for them with their applied email.`)) return
    }
    void updateStatus(a, status)
  }

  async function deleteAdmission(a: Admission) {
    if (!confirm(`Delete application from ${a.applicantName}? This cannot be undone.`)) return
    setDeleting(a.id)
    try {
      await api(`/api/admissions/${a.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Application deleted' })
      if (viewing?.id === a.id) setViewing(null)
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
              <ClipboardPaste className="h-7 w-7" /> Admissions
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Track applications and manage enrollment.
            </p>
          </div>
          <Button
            onClick={() => setAdding(true)}
            variant="secondary"
            className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <Plus className="h-4 w-4" /> New Application
          </Button>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardPaste} label="Total Applications" value={String(stats.total)} sub="all time" color="emerald" />
        <StatCard icon={Inbox} label="Pending Review" value={String(stats.pending)} sub="awaiting action" color={stats.pending > 0 ? 'amber' : 'slate'} />
        <StatCard icon={CheckCircle2} label="Accepted" value={String(stats.accepted)} sub="ready to enroll" color="teal" />
        <StatCard icon={UserPlus} label="Enrolled" value={String(stats.enrolled)} sub="students added" color="cyan" />
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <TabsList className="flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">{s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicants..." className="pl-9" />
        </div>
      </div>

      {/* Applications table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ClipboardPaste className="h-10 w-10 opacity-40" />
              <p className="text-sm">No applications match your filter.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { setFilter('All'); setSearch('') }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Applicant</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Grade</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Parent / Guardian</th>
                    <th className="hidden p-3 text-left font-medium xl:table-cell">Previous School</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-border transition hover:bg-muted/40">
                      <td className="p-3">
                        <button onClick={() => setViewing(a)} className="flex items-center gap-3 text-left">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white shadow-sm">
                            {initials(a.applicantName) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium hover:text-emerald-600">{a.applicantName}</p>
                            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <Badge variant="outline">{gradeToForm(a.gradeApplied)}</Badge>
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        <p className="text-sm">{a.parentName ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{a.parentPhone ?? ''}</p>
                      </td>
                      <td className="hidden p-3 text-xs text-muted-foreground xl:table-cell">
                        {a.previousSchool ?? '—'}
                      </td>
                      <td className="p-3">
                        <Badge className={cn('font-medium', statusBadgeClass(a.status))}>{a.status}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(a)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actingOn === a.id} title="Update status">
                                {actingOn === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                disabled={a.status === 'Reviewing'}
                                onClick={() => quickUpdateStatus(a, 'Reviewing')}
                              >
                                <PenLine className="h-3.5 w-3.5" /> Mark Reviewing
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-emerald-700 focus:text-emerald-700 dark:text-emerald-300"
                                disabled={a.status === 'Accepted'}
                                onClick={() => quickUpdateStatus(a, 'Accepted')}
                              >
                                <Check className="h-3.5 w-3.5" /> Accept
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-700 focus:text-rose-700 dark:text-rose-300"
                                disabled={a.status === 'Rejected'}
                                onClick={() => quickUpdateStatus(a, 'Rejected')}
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-teal-700 focus:text-teal-700 dark:text-teal-300"
                                disabled={a.status === 'Enrolled'}
                                onClick={() => quickUpdateStatus(a, 'Enrolled')}
                              >
                                <UserPlus className="h-3.5 w-3.5" /> Enroll
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            disabled={deleting === a.id}
                            onClick={() => deleteAdmission(a)}
                            title="Delete application"
                          >
                            {deleting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {adding && (
        <ApplicationDialog onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh() }} />
      )}
      {viewing && (
        <DetailDialog
          admission={viewing}
          actingOn={actingOn}
          onClose={() => setViewing(null)}
          onUpdateStatus={updateStatus}
          onDeleted={() => deleteAdmission(viewing)}
        />
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal:    'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    slate:   'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ApplicationDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    applicantName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    gradeApplied: '7',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    previousSchool: '',
  })

  function setField<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.applicantName.trim() || !form.email.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Applicant name and email are required.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/admissions', {
        method: 'POST',
        body: {
          applicantName: form.applicantName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          dob: form.dob || null,
          gender: form.gender,
          gradeApplied: Number(form.gradeApplied),
          parentName: form.parentName.trim() || null,
          parentPhone: form.parentPhone.trim() || null,
          parentEmail: form.parentEmail.trim() || null,
          address: form.address.trim() || null,
          previousSchool: form.previousSchool.trim() || null,
        },
      })
      addToast({
        type: 'success',
        title: 'Application submitted',
        body: `${form.applicantName.trim()}'s application is now Pending review.`,
      })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Submit failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> New Application
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Applicant Name *"><Input value={form.applicantName} onChange={(e) => setField('applicantName', e.target.value)} placeholder="e.g. John Doe" /></Field>
          <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="john@example.com" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="555-0100" /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setField('dob', e.target.value)} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setField('gender', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Grade Applying For">
            <Select value={form.gradeApplied} onValueChange={(v) => setField('gradeApplied', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => <SelectItem key={g} value={String(g)}>{gradeToForm(g)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Parent / Guardian Name"><Input value={form.parentName} onChange={(e) => setField('parentName', e.target.value)} /></Field>
          <Field label="Parent Phone"><Input value={form.parentPhone} onChange={(e) => setField('parentPhone', e.target.value)} /></Field>
          <Field label="Parent Email" className="sm:col-span-2"><Input type="email" value={form.parentEmail} onChange={(e) => setField('parentEmail', e.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Street, City, Parish" /></Field>
          <Field label="Previous School" className="sm:col-span-2"><Input value={form.previousSchool} onChange={(e) => setField('previousSchool', e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-sm">{value}</p>
      </div>
    </div>
  )
}

function buildTimeline(a: Admission) {
  const order = ['Pending', 'Reviewing', 'Accepted', 'Enrolled']
  if (a.status === 'Rejected') {
    return [
      { label: 'Application Submitted', done: true, note: `Applied ${timeAgo(a.createdAt)}` },
      { label: 'Under Review', done: false },
      { label: 'Rejected', done: true, note: a.reviewedByName ? `by ${a.reviewedByName}` : undefined },
    ]
  }
  const idx = order.indexOf(a.status)
  return [
    { label: 'Application Submitted', done: true, note: `Applied ${timeAgo(a.createdAt)}` },
    { label: 'Under Review', done: idx >= 1 },
    { label: 'Accepted', done: idx >= 2 },
    { label: 'Enrolled', done: idx >= 3, note: idx >= 3 ? 'Student account created' : undefined },
  ]
}

function DetailDialog({
  admission,
  actingOn,
  onClose,
  onUpdateStatus,
  onDeleted,
}: {
  admission: Admission
  actingOn: string | null
  onClose: () => void
  onUpdateStatus: (a: Admission, status: string) => Promise<void>
  onDeleted: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [notes, setNotes] = useState(admission.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [confirmEnroll, setConfirmEnroll] = useState(false)

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await api(`/api/admissions/${admission.id}`, {
        method: 'PATCH',
        body: { notes: notes.trim() || null },
      })
      addToast({ type: 'success', title: 'Notes saved' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSavingNotes(false)
    }
  }

  const timeline = buildTimeline(admission)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-emerald-600" /> Application Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Header summary */}
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white shadow-sm">
              {initials(admission.applicantName) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{admission.applicantName}</p>
              <p className="text-xs text-muted-foreground">
                Applied {timeAgo(admission.createdAt)} for {gradeToForm(admission.gradeApplied)}
              </p>
            </div>
            <Badge className={cn('font-medium', statusBadgeClass(admission.status))}>{admission.status}</Badge>
          </div>

          {/* Status timeline */}
          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Timeline</p>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    t.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {t.done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-semibold">{i + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={cn('text-sm font-medium', t.done ? '' : 'text-muted-foreground')}>{t.label}</p>
                    {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact / details grid */}
          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <Detail icon={Mail} label="Email" value={admission.email} />
            <Detail icon={Phone} label="Phone" value={admission.phone ?? '—'} />
            <Detail icon={Calendar} label="Date of Birth" value={admission.dob ? new Date(admission.dob).toLocaleDateString() : '—'} />
            <Detail icon={UserPlus} label="Gender" value={admission.gender ?? '—'} />
            <Detail icon={GraduationCap} label="Grade Applied" value={gradeToForm(admission.gradeApplied)} />
            <Detail icon={FileText} label="Previous School" value={admission.previousSchool ?? '—'} />
            <Detail icon={UserPlus} label="Parent / Guardian" value={admission.parentName ?? '—'} />
            <Detail icon={Phone} label="Parent Phone" value={admission.parentPhone ?? '—'} />
            <Detail icon={Mail} label="Parent Email" value={admission.parentEmail ?? '—'} />
            <Detail icon={Home} label="Address" value={admission.address ?? '—'} />
          </div>
          {admission.reviewedByName && (
            <p className="text-xs text-muted-foreground">
              Last reviewed by <span className="font-medium text-foreground">{admission.reviewedByName}</span>
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this applicant..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                Save Notes
              </Button>
            </div>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
            {confirmEnroll ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Enrolling will <strong>create a student login account</strong> for {admission.applicantName}. They will be able to sign in with their applied email. Continue?
                  </span>
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmEnroll(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={actingOn === admission.id}
                    className="bg-teal-600 text-white hover:bg-teal-700"
                    onClick={() => { void onUpdateStatus(admission, 'Enrolled'); setConfirmEnroll(false) }}
                  >
                    {actingOn === admission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    Confirm Enrollment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {admission.status !== 'Reviewing' && (
                  <Button size="sm" variant="outline" disabled={actingOn === admission.id} onClick={() => onUpdateStatus(admission, 'Reviewing')}>
                    <PenLine className="h-3.5 w-3.5" /> Mark Reviewing
                  </Button>
                )}
                {admission.status !== 'Accepted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    disabled={actingOn === admission.id}
                    onClick={() => onUpdateStatus(admission, 'Accepted')}
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                )}
                {admission.status !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                    disabled={actingOn === admission.id}
                    onClick={() => onUpdateStatus(admission, 'Rejected')}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                )}
                {admission.status !== 'Enrolled' && (
                  <Button
                    size="sm"
                    className="bg-teal-600 text-white hover:bg-teal-700"
                    disabled={actingOn === admission.id}
                    onClick={() => setConfirmEnroll(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Enroll
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={onDeleted}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
