'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, Plus, Pencil, Trash2, Loader2, Printer, CalendarDays,
  Clock, DoorOpen, FileText, BookMarked, AlarmClock, X, Send, Filter, Layers,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Exam } from '@/lib/types'
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
import { cn } from '@/lib/utils'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const SUBJECTS = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Spanish', 'Physical Education', 'Information Technology']

const STAFF_ROLES = ['Admin', 'Principal', 'Vice Principal', 'Teacher']

export function ExamsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const settings = useAppStore((s) => s.settings)
  const school = escapeHtml(settings?.name || 'EduCenterJM')

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isStudent = user.role === 'Student'
  const canManage = STAFF_ROLES.includes(user.role)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ exams: Exam[] }>('/api/exams')
      setExams(res.exams)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load exams', body: e.message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const today = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    if (isStudent || classFilter === 'all') return exams
    return exams.filter((e) => e.className === classFilter)
  }, [exams, classFilter, isStudent])

  const upcoming = useMemo(
    () => filtered.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [filtered, today],
  )

  // Staff stat cards
  const stats = useMemo(() => {
    const total = exams.length
    const up = exams.filter((e) => e.date >= today).length
    const subjects = new Set(exams.map((e) => e.subject)).size
    const classes = new Set(exams.map((e) => e.className)).size
    return { total, up, subjects, classes }
  }, [exams, today])

  async function remove(exam: Exam) {
    if (!confirm(`Delete "${exam.title}"? This cannot be undone.`)) return
    setDeletingId(exam.id)
    try {
      await api(`/api/exams/${exam.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Exam deleted', body: `"${exam.title}" removed.` })
      setExams((prev) => prev.filter((e) => e.id !== exam.id))
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeletingId(null)
    }
  }

  function printTimetable() {
    const list = isStudent ? upcoming : filtered
    const rows = list.map((e) => `
      <tr>
        <td>${escapeHtml(e.title)}</td>
        <td>${escapeHtml(e.subject)}</td>
        <td>${escapeHtml(e.className)}</td>
        <td>${formatDate(e.date)}</td>
        <td>${escapeHtml(e.startTime || '09:00')}</td>
        <td>${e.duration} min</td>
        <td>${escapeHtml(e.room ?? '—')}</td>
        <td style="text-align:right">${e.totalMarks}</td>
      </tr>`).join('')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) {
      addToast({ type: 'error', title: 'Pop-up blocked', body: 'Please allow pop-ups to print.' })
      return
    }
    w.document.write(`<!doctype html><html><head><title>Exam Timetable — ${school}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0f172a; }
        h1 { font-size: 22px; margin: 0 0 4px; color: var(--brand-strong); }
        .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: var(--brand-tint-faint); color: var(--brand-strong); text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--brand-tint-soft); }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .foot { margin-top: 28px; color: #94a3b8; font-size: 11px; text-align: center; }
      </style></head><body>
      <h1>${school} — Exam Timetable</h1>
      <div class="sub">${isStudent ? 'Upcoming exams for your class' : 'All scheduled exams'} · Generated ${new Date().toLocaleString()}</div>
      <table>
        <thead><tr>
          <th>Title</th><th>Subject</th><th>Class</th><th>Date</th><th>Start</th><th>Duration</th><th>Room</th><th style="text-align:right">Marks</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">No exams scheduled.</td></tr>'}</tbody>
      </table>
      <div class="foot">© ${school} · Printed on ${new Date().toLocaleDateString()}</div>
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
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
              <GraduationCap className="h-7 w-7" /> Exam Management
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              {isStudent
                ? 'View your upcoming exams, rooms, and times.'
                : 'Schedule exams, assign rooms, and view the exam timetable.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              onClick={printTimetable}
              variant="secondary"
              className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Printer className="h-4 w-4" /> Print Timetable
            </Button>
            {canManage && (
              <Button
                onClick={() => setAdding(true)}
                className="border-0 bg-white text-brand-strong hover:bg-brand/5"
              >
                <Plus className="h-4 w-4" /> Schedule Exam
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isStudent ? (
        <StudentExams
          upcoming={upcoming}
          totalExams={exams.length}
          today={today}
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FileText} label="Total Exams" value={String(stats.total)} sub="all scheduled" color="emerald" />
            <StatCard icon={AlarmClock} label="Upcoming" value={String(stats.up)} sub="date ≥ today" color="teal" />
            <StatCard icon={BookMarked} label="Subjects" value={String(stats.subjects)} sub="unique subjects" color="cyan" />
            <StatCard icon={Layers} label="Classes Affected" value={String(stats.classes)} sub="classrooms involved" color="amber" />
          </div>

          {/* Filter bar */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <span className="pl-9 text-sm text-muted-foreground">Filter exams by class</span>
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Timetable table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-brand" /> Exam Timetable
              </CardTitle>
              <CardDescription>
                {filtered.length} exam{filtered.length === 1 ? '' : 's'} {classFilter !== 'all' ? `in class ${classFilter}` : 'across all classes'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No exams scheduled{classFilter !== 'all' ? ` for class ${classFilter}` : ''}.</p>
                  {canManage && (
                    <Button size="sm" className="mt-1 bg-brand text-brand-foreground hover:bg-brand-strong" onClick={() => setAdding(true)}>
                      <Plus className="h-4 w-4" /> Schedule Exam
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Title</th>
                        <th className="hidden p-3 text-left font-medium sm:table-cell">Subject</th>
                        <th className="p-3 text-left font-medium">Class</th>
                        <th className="hidden p-3 text-left font-medium md:table-cell">Date</th>
                        <th className="hidden p-3 text-left font-medium lg:table-cell">Time</th>
                        <th className="hidden p-3 text-left font-medium lg:table-cell">Room</th>
                        <th className="hidden p-3 text-right font-medium xl:table-cell">Marks</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e) => {
                        const isUpcoming = e.date >= today
                        return (
                          <tr key={e.id} className="border-b border-border transition hover:bg-muted/40">
                            <td className="p-3">
                              <p className="font-medium leading-tight">{e.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {e.notes ? <span className="line-clamp-1">{e.notes}</span> : <span>—</span>}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                                {e.subject} · {formatDate(e.date)} · {e.startTime}
                              </p>
                            </td>
                            <td className="hidden p-3 sm:table-cell">
                              <Badge variant="outline" className="border-brand/25 bg-brand/5 text-brand-strong dark:border-brand/40 dark:bg-brand/10 dark:text-brand">
                                {e.subject}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary" className={cn(isUpcoming ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300' : 'bg-muted text-muted-foreground')}>
                                {e.className}
                              </Badge>
                            </td>
                            <td className="hidden p-3 md:table-cell">
                              <p className="text-sm">{formatDate(e.date)}</p>
                              <p className="text-xs text-muted-foreground">{relativeDay(e.date, today)}</p>
                            </td>
                            <td className="hidden p-3 text-sm lg:table-cell">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" /> {e.startTime}
                              </span>
                              <span className="text-xs text-muted-foreground">{e.duration} min</span>
                            </td>
                            <td className="hidden p-3 text-sm lg:table-cell">
                              {e.room ? (
                                <span className="flex items-center gap-1">
                                  <DoorOpen className="h-3 w-3 text-muted-foreground" /> {e.room}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="hidden p-3 text-right xl:table-cell">
                              <span className="font-medium">{e.totalMarks}</span>
                              <span className="text-xs text-muted-foreground"> / pass {e.passingMarks}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(e)} title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                  onClick={() => remove(e)}
                                  disabled={deletingId === e.id}
                                  title="Delete"
                                >
                                  {deletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
        </>
      )}

      {(adding || editing) && (
        <ExamDialog
          exam={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ---------------- Student variant ----------------
function StudentExams({ upcoming, totalExams, today }: { upcoming: Exam[]; totalExams: number; today: string }) {
  const addToast = useAppStore((s) => s.addToast)
  if (totalExams === 0) {
    return (
      <Card>
        <CardContent className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
          <CalendarDays className="h-10 w-10 opacity-40" />
          <p className="text-sm">No exams scheduled for your class right now.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <>
      {/* Count badge */}
      <Card className="border-brand/60 bg-gradient-to-br from-brand/10 to-brand/10 dark:border-brand/40 dark:from-brand/10 dark:to-brand/10">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">
            <AlarmClock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              You have {upcoming.length} upcoming exam{upcoming.length === 1 ? '' : 's'}.
            </p>
            <p className="text-xs text-muted-foreground">
              {upcoming.length > 0
                ? `Next exam: ${upcoming[0].title} on ${formatDate(upcoming[0].date)}`
                : 'Check back later for new exam postings.'}
            </p>
          </div>
          {upcoming.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => addToast({ type: 'info', title: 'No upcoming exams', body: 'You are all caught up.' })}
            >
              View past exams
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upcoming exam list */}
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlarmClock className="h-8 w-8 opacity-40" />
              <p className="text-sm">No upcoming exams. Enjoy the breather!</p>
            </CardContent>
          </Card>
        ) : (
          upcoming.map((e) => {
            const days = daysUntil(e.date, today)
            const urgent = days <= 3
            const soon = days > 3 && days <= 7
            return (
              <Card
                key={e.id}
                className={cn(
                  'overflow-hidden border-l-4 transition hover:shadow-md',
                  urgent && 'border-l-amber-500',
                  soon && 'border-l-brand',
                  !urgent && !soon && 'border-l-muted',
                )}
              >
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold leading-tight">{e.title}</h3>
                      <Badge variant="outline" className="border-brand/25 bg-brand/5 text-brand-strong dark:border-brand/40 dark:bg-brand/10 dark:text-brand">
                        {e.subject}
                      </Badge>
                      <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                        Class {e.className}
                      </Badge>
                      {urgent && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          <AlarmClock className="mr-1 h-3 w-3" /> In {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}
                        </Badge>
                      )}
                      {soon && (
                        <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">
                          In {days} days
                        </Badge>
                      )}
                    </div>
                    {e.notes && (
                      <p className="mt-1.5 text-sm text-muted-foreground">{e.notes}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-brand" /> {formatDate(e.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-brand" /> {e.startTime} · {e.duration} min
                      </span>
                      {e.room && (
                        <span className="flex items-center gap-1">
                          <DoorOpen className="h-3.5 w-3.5 text-brand" /> Room {e.room}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-brand" /> {e.totalMarks} marks (pass {e.passingMarks})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}

// ---------------- Exam dialog (create + edit) ----------------
function ExamDialog({ exam, onClose, onSaved }: { exam: Exam | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: exam?.title ?? '',
    subject: exam?.subject ?? 'Mathematics',
    className: exam?.className ?? '7A',
    date: exam?.date ?? defaultDate(),
    startTime: exam?.startTime ?? '09:00',
    duration: String(exam?.duration ?? 120),
    room: exam?.room ?? '',
    totalMarks: String(exam?.totalMarks ?? 100),
    passingMarks: String(exam?.passingMarks ?? 40),
    notes: exam?.notes ?? '',
  })

  async function save() {
    if (!form.title.trim()) {
      addToast({ type: 'warning', title: 'Missing title', body: 'Please enter an exam title.' })
      return
    }
    if (!form.date) {
      addToast({ type: 'warning', title: 'Missing date', body: 'Please pick an exam date.' })
      return
    }
    const duration = Number(form.duration)
    const totalMarks = Number(form.totalMarks)
    const passingMarks = Number(form.passingMarks)
    if (!Number.isFinite(duration) || duration < 1) {
      addToast({ type: 'warning', title: 'Invalid duration', body: 'Duration must be at least 1 minute.' })
      return
    }
    if (!Number.isFinite(totalMarks) || totalMarks < 1) {
      addToast({ type: 'warning', title: 'Invalid total marks', body: 'Total marks must be at least 1.' })
      return
    }
    if (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
      addToast({ type: 'warning', title: 'Invalid passing marks', body: 'Passing marks must be between 0 and total marks.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        subject: form.subject,
        className: form.className,
        date: form.date,
        startTime: form.startTime,
        duration,
        room: form.room.trim() || null,
        totalMarks,
        passingMarks,
        notes: form.notes.trim() || null,
      }
      if (exam) {
        await api(`/api/exams/${exam.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Exam updated', body: `"${form.title.trim()}" saved.` })
      } else {
        await api('/api/exams', { method: 'POST', body })
        addToast({ type: 'success', title: 'Exam scheduled', body: `"${form.title.trim()}" added to the timetable.` })
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
            <GraduationCap className="h-5 w-5 text-brand" />
            {exam ? 'Edit Exam' : 'Schedule New Exam'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Exam Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. End of Term Mathematics Exam" />
          </div>
          <Field label="Subject">
            <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Class">
            <Select value={form.className} onValueChange={(v) => setForm({ ...form, className: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASSES.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date *">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Start Time">
            <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" min={1} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </Field>
          <Field label="Room">
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Hall A / Room 204" />
          </Field>
          <Field label="Total Marks">
            <Input type="number" min={1} value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} />
          </Field>
          <Field label="Passing Marks">
            <Input type="number" min={0} value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} />
          </Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Topics covered, allowed materials, seating notes…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {exam ? 'Save Changes' : 'Schedule Exam'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------- helpers ----------------
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-semibold text-brand dark:text-brand">{sub}</p>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function defaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso: string, todayIso: string): number {
  const d = new Date(iso + 'T00:00:00').getTime()
  const t = new Date(todayIso + 'T00:00:00').getTime()
  return Math.round((d - t) / 86400000)
}

function relativeDay(iso: string, todayIso: string): string {
  const diff = daysUntil(iso, todayIso)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `in ${diff} days`
  return `${Math.abs(diff)} days ago`
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
