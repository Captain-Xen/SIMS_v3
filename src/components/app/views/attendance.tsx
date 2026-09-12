'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Save, Loader2, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student, Attendance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts'

const STATUSES = ['Present', 'Late', 'Absent', 'Excused']

const STATUS_COLORS: Record<string, string> = {
  Present: '#10b981',
  Late: '#f59e0b',
  Absent: '#ef4444',
  Excused: '#8b5cf6',
}

const STATUS_BADGE: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Late: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Absent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  Excused: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AttendanceView() {
  const user = useAppStore((s) => s.user)!
  if (user.role === 'Student') return <StudentAttendance />
  return <TeacherAttendance />
}

function TeacherAttendance() {
  const addToast = useAppStore((s) => s.addToast)
  const [date, setDate] = useState(todayStr())
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, string>>({})

  async function load(targetDate: string) {
    setLoading(true)
    try {
      const [stRes, aRes] = await Promise.all([
        api<{ students: Student[] }>('/api/students'),
        api<{ attendance: Attendance[] }>('/api/attendance', { query: { date: targetDate } }),
      ])
      setStudents(stRes.students.sort((a, b) => a.name.localeCompare(b.name)))
      setAttendance(aRes.attendance)
      const next: Record<string, string> = {}
      for (const s of stRes.students) {
        const found = aRes.attendance.find((a) => a.studentId === s.id)
        next[s.id] = found ? found.status : 'Present'
      }
      setStatuses(next)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load attendance', body: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [date])

  function setAll(status: string) {
    const next: Record<string, string> = {}
    for (const s of students) next[s.id] = status
    setStatuses(next)
  }

  async function save() {
    setSaving(true)
    try {
      const records = students.map((s) => ({ studentId: s.id, status: statuses[s.id] ?? 'Present' }))
      await api('/api/attendance', { method: 'POST', body: { date, records } })
      addToast({ type: 'success', title: 'Attendance saved', body: `${records.length} records for ${date}.` })
      load(date)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    const counts: Record<string, number> = { Present: 0, Late: 0, Absent: 0, Excused: 0 }
    for (const s of students) {
      const st = statuses[s.id] ?? 'Present'
      counts[st] = (counts[st] ?? 0) + 1
    }
    return counts
  }, [students, statuses])

  const donutData = STATUSES.map((s) => ({ name: s, value: summary[s] ?? 0, color: STATUS_COLORS[s] })).filter((d) => d.value > 0)
  const presentPct = students.length ? Math.round(((summary.Present ?? 0) / students.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><ClipboardCheck className="h-7 w-7" /> Attendance Tracking</h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">Record and monitor student attendance.</p>
          </div>
        </CardContent>
      </Card>

      {/* Date + actions */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <div className="space-y-1.5 lg:w-56">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <span className="self-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick fill:</span>
            {STATUSES.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => setAll(s)}>{s}</Button>
            ))}
          </div>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Attendance
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary cards + donut */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-emerald-600" /> Summary</CardTitle>
            <CardDescription>{date} · {students.length} students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SummaryStat icon={CheckCircle2} label="Present" value={summary.Present ?? 0} color="emerald" />
              <SummaryStat icon={Clock} label="Late" value={summary.Late ?? 0} color="amber" />
              <SummaryStat icon={AlertCircle} label="Absent" value={summary.Absent ?? 0} color="rose" />
              <SummaryStat icon={AlertCircle} label="Excused" value={summary.Excused ?? 0} color="violet" />
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-3xl font-bold text-emerald-600">{presentPct}%</p>
              <p className="text-xs text-muted-foreground">present today</p>
            </div>
            {donutData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Student list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mark Attendance</CardTitle>
            <CardDescription>Choose a status for each student</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : students.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 opacity-40" />
                <p className="text-sm">No students enrolled.</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="p-3 text-left font-medium">Student</th>
                      <th className="hidden p-3 text-left font-medium sm:table-cell">Class</th>
                      <th className="p-3 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const status = statuses[s.id] ?? 'Present'
                      return (
                        <tr key={s.id} className="border-b border-border transition hover:bg-muted/40">
                          <td className="p-3">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.admissionNo}</p>
                          </td>
                          <td className="hidden p-3 sm:table-cell"><Badge variant="outline">{s.className}</Badge></td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant="outline" className={cn('border-transparent', STATUS_BADGE[status])}>{status}</Badge>
                              <Select value={status} onValueChange={(v) => setStatuses({ ...statuses, [s.id]: v })}>
                                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                              </Select>
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
      </div>
    </div>
  )
}

function StudentAttendance() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        // Load all attendance and filter client-side (no per-student endpoint expected)
        const res = await api<{ attendance: Attendance[] }>('/api/attendance')
        if (!active) return
        setRecords(res.attendance.filter((a) => a.studentId === user.id))
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load attendance', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, user.id])

  const summary = useMemo(() => {
    const counts: Record<string, number> = { Present: 0, Late: 0, Absent: 0, Excused: 0 }
    for (const r of records) counts[r.status] = (counts[r.status] ?? 0) + 1
    return counts
  }, [records])

  const total = records.length || 1
  const presentPct = Math.round(((summary.Present ?? 0) / total) * 100)
  const donutData = STATUSES.map((s) => ({ name: s, value: summary[s] ?? 0, color: STATUS_COLORS[s] })).filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat icon={CheckCircle2} label="Present" value={summary.Present ?? 0} color="emerald" />
        <SummaryStat icon={Clock} label="Late" value={summary.Late ?? 0} color="amber" />
        <SummaryStat icon={AlertCircle} label="Absent" value={summary.Absent ?? 0} color="rose" />
        <SummaryStat icon={AlertCircle} label="Excused" value={summary.Excused ?? 0} color="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Attendance Rate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-4xl font-bold text-emerald-600">{presentPct}%</p>
              <p className="text-xs text-muted-foreground">present across {records.length} record(s)</p>
            </div>
            {donutData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">My Attendance History</CardTitle>
            <CardDescription>Read-only record of your attendance</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : records.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 opacity-40" />
                <p className="text-sm">No attendance records yet.</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-border bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="p-3 text-left font-medium">Date</th>
                      <th className="p-3 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                      <tr key={r.id} className="border-b border-border transition hover:bg-muted/40">
                        <td className="p-3 font-medium">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="p-3 text-right"><Badge variant="outline" className={cn('border-transparent', STATUS_BADGE[r.status])}>{r.status}</Badge></td>
                      </tr>
                    ))}
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

function SummaryStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colors[color])}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
