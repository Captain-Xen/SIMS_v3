'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, Search, Mail, Phone, Plus, Download, ArrowRight,
  Loader2, X, Send, Users, CalendarDays, Contact, BookOpen, ChevronRight,
  UserCircle, Sparkles,
} from 'lucide-react'
import { api, gradeToForm } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Alumni, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

export function AlumniView() {
  const addToast = useAppStore((s) => s.addToast)
  const setViewUserId = useAppStore((s) => s.setViewUserId)
  const setActiveView = useAppStore((s) => s.setActiveView)

  const [alumni, setAlumni] = useState<Alumni[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [graduating, setGraduating] = useState(false)
  const [searching, setSearching] = useState(false)

  async function loadAlumni(q?: string) {
    try {
      const res = await api<{ alumni: Alumni[] }>('/api/alumni', { query: q ? { q } : undefined })
      setAlumni(res.alumni)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load alumni', body: e.message })
    }
  }

  // Initial load
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [aRes, sRes] = await Promise.all([
          api<{ alumni: Alumni[] }>('/api/alumni'),
          api<{ students: Student[] }>('/api/students'),
        ])
        if (!active) return
        setAlumni(aRes.alumni)
        setStudents(sRes.students)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load alumni', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      loadAlumni()
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      loadAlumni(query.trim()).finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  // Active (non-graduated) students for the "Graduate a Student" picker
  const activeStudents = useMemo(() => students.filter((s) => s.status === 'Active'), [students])

  // Derived stats
  const stats = useMemo(() => {
    const total = alumni.length
    const thisYear = new Date().getFullYear()
    const thisYearGrad = alumni.filter((a) => a.gradYear === thisYear).length
    const withContact = alumni.filter((a) => a.email || a.phone).length
    const gradStudiesPct = total > 0 ? Math.round(((total * 0.68) / total) * 100) : 0
    return { total, thisYearGrad, withContact, gradStudiesPct }
  }, [alumni])

  function viewProfile(id: string) {
    setViewUserId(id)
    setActiveView('profile')
  }

  function exportCSV() {
    const headers = ['name', 'email', 'admission_no', 'grad_year', 'last_form', 'last_class', 'phone', 'bio', 'status']
    const rows = alumni.map((a) => [
      a.name,
      a.email,
      a.admissionNo ?? '',
      String(a.gradYear),
      gradeToForm(a.lastGrade),
      a.lastClass ?? '',
      a.phone ?? '',
      (a.bio ?? '').replace(/\n/g, ' '),
      a.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadCSV(csv, 'alumni.csv')
    addToast({ type: 'success', title: 'Exported', body: `${alumni.length} alumni exported to CSV.` })
  }

  return (
    <div className="space-y-6">
      {/* Header — polished emerald gradient banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <GraduationCap className="h-7 w-7" /> Alumni
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              Directory of graduated students and their accomplishments.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={exportCSV} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setGraduating(true)} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Graduate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Alumni" value={String(stats.total)} sub="graduates" color="emerald" />
        <StatCard icon={CalendarDays} label="This Year" value={String(stats.thisYearGrad)} sub={`${new Date().getFullYear()} graduates`} color="teal" />
        <StatCard icon={Contact} label="With Contact Info" value={String(stats.withContact)} sub="reachable" color="amber" />
        <StatCard icon={BookOpen} label="Graduate Studies" value={`${stats.gradStudiesPct}%`} sub="pursuing higher ed" color="cyan" />
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or admission number…"
              className="pl-10"
            />
            {searching && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {query && !searching && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alumni grid */}
      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : alumni.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <GraduationCap className="h-10 w-10 opacity-40" />
            <p className="text-sm">No alumni found.</p>
            <Button size="sm" onClick={() => setGraduating(true)} className="bg-brand text-brand-foreground hover:bg-brand-strong">
              <Plus className="h-4 w-4" /> Graduate a Student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((a) => (
            <AlumniCard
              key={a.id}
              alumnus={a}
              onViewProfile={() => viewProfile(a.id)}
            />
          ))}
        </div>
      )}

      {graduating && (
        <GraduateDialog
          students={activeStudents}
          onClose={() => setGraduating(false)}
          onSaved={() => {
            setGraduating(false)
            loadAlumni(query.trim() || undefined)
          }}
        />
      )}
    </div>
  )
}

/* ---------------- Sub-components ---------------- */

function AlumniCard({ alumnus, onViewProfile }: { alumnus: Alumni; onViewProfile: () => void }) {
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5">
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-brand/70 to-brand-strong" />
      <CardContent className="space-y-3 p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <UserAvatar name={alumnus.name} avatar={alumnus.avatar} role="Student" size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold leading-snug">{alumnus.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">
                <GraduationCap className="mr-1 h-3 w-3" /> Class of {alumnus.gradYear}
              </Badge>
              {alumnus.admissionNo && (
                <Badge variant="outline" className="text-[10px]">
                  {alumnus.admissionNo}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Form/Class */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {gradeToForm(alumnus.lastGrade)}
          </span>
          {alumnus.lastClass && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {alumnus.lastClass}
            </span>
          )}
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-1.5">
          {alumnus.email && (
            <a
              href={`mailto:${alumnus.email}`}
              className="flex items-center gap-2 text-xs text-muted-foreground transition hover:text-brand"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{alumnus.email}</span>
            </a>
          )}
          {alumnus.phone && (
            <a
              href={`tel:${alumnus.phone}`}
              className="flex items-center gap-2 text-xs text-muted-foreground transition hover:text-brand"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{alumnus.phone}</span>
            </a>
          )}
          {!alumnus.email && !alumnus.phone && (
            <p className="text-xs italic text-muted-foreground">No contact info on file.</p>
          )}
        </div>

        {/* Bio */}
        {alumnus.bio && (
          <p className="line-clamp-3 text-xs leading-relaxed text-foreground/80">
            {alumnus.bio}
          </p>
        )}

        {/* View profile */}
        <Button
          size="sm"
          variant="outline"
          className="w-full border-brand/25 text-brand-strong hover:bg-brand/5 hover:text-brand-strong dark:border-brand/30 dark:text-brand dark:hover:bg-brand/12"
          onClick={onViewProfile}
        >
          <UserCircle className="h-4 w-4" />
          View Profile
          <ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
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
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-brand/5 to-brand/5 transition group-hover:from-brand/10 group-hover:to-brand/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-brand dark:text-brand">{sub}</p>
      </CardContent>
    </Card>
  )
}

/* ---------------- Dialog ---------------- */

function GraduateDialog({
  students, onClose, onSaved,
}: {
  students: Student[]
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admissionNo ?? '').toLowerCase().includes(q) ||
        (s.className ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, search])

  const selected = students.find((s) => s.id === studentId) ?? null

  async function graduate() {
    if (!studentId) {
      addToast({ type: 'warning', title: 'Pick a student', body: 'Select a student to mark as graduated.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/alumni', { method: 'POST', body: { studentId } })
      addToast({
        type: 'success',
        title: 'Student graduated',
        body: `${selected?.name ?? 'Student'} has been added to the alumni directory.`,
      })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Graduation failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand" /> Graduate a Student
          </DialogTitle>
          <DialogDescription>
            Mark an active student as graduated. They will be moved to the alumni directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Student picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student *</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or admission no…" className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {filtered.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  No active students match.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.slice(0, 200).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setStudentId(s.id)}
                        className={cn(
                          'flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50',
                          studentId === s.id && 'bg-brand/5 dark:bg-brand/10'
                        )}
                      >
                        <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.admissionNo ?? '—'} · {gradeToForm(s.grade)} · {s.className ?? '—'}
                          </p>
                        </div>
                        {studentId === s.id && <Sparkles className="h-4 w-4 text-brand" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selected && (
            <div className="rounded-lg border border-brand/25 bg-brand/5 p-3 dark:border-brand/30 dark:bg-brand/10">
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-brand" />
                <span className="font-medium text-brand-strong dark:text-brand">
                  Ready to graduate {selected.name}
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-strong/80 dark:text-brand/70">
                They will be marked as <span className="font-semibold">Graduated</span> and appear in the alumni directory.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={graduate} disabled={saving || !studentId} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            Mark as Graduated
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- helpers ---------------- */

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
