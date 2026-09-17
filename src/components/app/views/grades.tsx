'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Save, Loader2, TrendingUp, Award, BookOpen } from 'lucide-react'
import { api, scoreToLetter, gradeToForm } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student, Grade } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const SUBJECTS = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics', 'Spanish', 'French', 'History', 'Geography', 'Information Technology', 'Principles of Business', 'Principles of Accounts', 'Physical Education', 'Visual Arts']
const TERMS = ['Term 1', 'Term 2', 'Term 3']

function letterColor(letter: string): string {
  if (letter.startsWith('A')) return 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand'
  if (letter.startsWith('B')) return 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
  if (letter.startsWith('C')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
  if (letter.startsWith('D')) return 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
  return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--chart-1)'
  if (score >= 65) return '#14b8a6'
  if (score >= 50) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function GradesView() {
  const user = useAppStore((s) => s.user)!
  const isStudent = user.role === 'Student'

  if (isStudent) return <StudentGrades />
  return <TeacherGrades />
}

function TeacherGrades() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [term, setTerm] = useState('Term 1')
  const [scores, setScores] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [stRes, gRes] = await Promise.all([
          api<{ students: Student[] }>('/api/students'),
          api<{ grades: Grade[] }>('/api/grades'),
        ])
        if (!active) return
        setStudents(stRes.students)
        setGrades(gRes.grades)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load grades data', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  // When teacher, default subject to first subject they teach
  useEffect(() => {
    if (!user.subjects) return
    try {
      const subs = JSON.parse(user.subjects) as string[]
      if (subs.length > 0 && !SUBJECTS.includes(subject)) setSubject(subs[0])
    } catch { /* ignore */ }
  }, [user.subjects])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => (classFilter ? s.className === classFilter : true)).sort((a, b) => a.name.localeCompare(b.name))
  }, [students, classFilter])

  // Initialize scores from existing grades
  useEffect(() => {
    const next: Record<string, string> = {}
    for (const s of filteredStudents) {
      const existing = grades.find((g) => g.studentId === s.id && g.subject === subject && g.term === term)
      next[s.id] = existing ? String(existing.score) : ''
    }
    setScores(next)
  }, [filteredStudents, grades, subject, term])

  async function saveGrades() {
    setSaving(true)
    try {
      const payload = filteredStudents
        .filter((s) => scores[s.id] !== '' && scores[s.id] !== undefined)
        .map((s) => ({ studentId: s.id, subject, score: Number(scores[s.id]), term }))
      if (payload.length === 0) {
        addToast({ type: 'warning', title: 'No grades to save', body: 'Enter at least one score first.' })
        setSaving(false)
        return
      }
      await api('/api/grades', { method: 'POST', body: payload })
      addToast({ type: 'success', title: 'Grades saved', body: `${payload.length} grade(s) recorded for ${subject}.` })
      const gRes = await api<{ grades: Grade[] }>('/api/grades')
      setGrades(gRes.grades)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  const classStats = useMemo(() => {
    const saved = filteredStudents.filter((s) => scores[s.id] !== '' && scores[s.id] !== undefined)
    const avg = saved.length ? Math.round(saved.reduce((a, s) => a + Number(scores[s.id]), 0) / saved.length) : 0
    return { saved: saved.length, total: filteredStudents.length, avg }
  }, [filteredStudents, scores])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><ClipboardList className="h-7 w-7" /> Academics & Grades</h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">Record and track student academic performance.</p>
          </div>
        </CardContent>
      </Card>

      {/* Filter toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
          <div className="space-y-1.5 lg:w-44">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</Label>
            <Select value={classFilter || 'all'} onValueChange={(v) => setClassFilter(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:flex-1">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:w-40">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={saveGrades} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Grades
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><BookOpen className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{classStats.saved}<span className="text-sm font-normal text-muted-foreground">/{classStats.total}</span></p><p className="text-xs text-muted-foreground">Graded students</p></div></CardContent></Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><TrendingUp className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{classStats.avg}%</p><p className="text-xs text-muted-foreground">Class average</p></div></CardContent></Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Award className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{subject}</p><p className="text-xs text-muted-foreground">{term} · {classFilter || 'All classes'}</p></div></CardContent></Card>
      </div>

      {/* Editable grade table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-brand" /> Enter Grades</CardTitle>
          <CardDescription>Enter a score from 0–100 for each student. Letter grade is shown automatically.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-40" />
              <p className="text-sm">No students match this filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Student</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Form</th>
                    <th className="p-3 text-center font-medium">Score</th>
                    <th className="p-3 text-center font-medium">Letter</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const raw = scores[s.id] ?? ''
                    const score = raw === '' ? null : Number(raw)
                    const letter = score !== null && !isNaN(score) ? scoreToLetter(score) : '—'
                    return (
                      <tr key={s.id} className="border-b border-border transition hover:bg-muted/40">
                        <td className="p-3">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.admissionNo}</p>
                        </td>
                        <td className="hidden p-3 md:table-cell"><Badge variant="outline">{gradeToForm(s.grade)}</Badge><span className="ml-1 text-xs text-muted-foreground">{s.className}</span></td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={raw}
                            onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                            className="mx-auto h-9 w-24 text-center"
                            placeholder="—"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={cn('border-transparent', score !== null && !isNaN(score) ? letterColor(letter) : 'text-muted-foreground')}>{letter}</Badge>
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
  )
}

function StudentGrades() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ grades: Grade[] }>('/api/grades', { query: { studentId: user.id } })
        if (!active) return
        setGrades(res.grades)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load grades', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, user.id])

  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  const chartData = grades.map((g) => ({ subject: g.subject.length > 10 ? g.subject.slice(0, 9) + '…' : g.subject, score: g.score }))

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><BookOpen className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{grades.length}</p><p className="text-xs text-muted-foreground">Subjects graded</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><TrendingUp className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{avg}%</p><p className="text-xs text-muted-foreground">Overall average</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Award className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{grades.length ? scoreToLetter(avg) : '—'}</p><p className="text-xs text-muted-foreground">Letter grade</p></div></CardContent></Card>
      </div>

      {/* Chart */}
      {grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-brand" /> Performance by Subject</CardTitle>
            <CardDescription>Your scores across all graded subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={scoreColor(d.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed grade list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-brand" /> My Grades</CardTitle>
          <CardDescription>Read-only record of your assessments</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : grades.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-40" />
              <p className="text-sm">No grades recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Subject</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Term</th>
                    <th className="p-3 text-center font-medium">Score</th>
                    <th className="p-3 text-center font-medium">Letter</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g) => {
                    const letter = scoreToLetter(g.score)
                    return (
                      <tr key={g.id} className="border-b border-border transition hover:bg-muted/40">
                        <td className="p-3 font-medium">{g.subject}</td>
                        <td className="hidden p-3 text-muted-foreground sm:table-cell">{g.term}</td>
                        <td className="p-3 text-center font-semibold">{g.score}%</td>
                        <td className="p-3 text-center"><Badge variant="outline" className={cn('border-transparent', letterColor(letter))}>{letter}</Badge></td>
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
  )
}
