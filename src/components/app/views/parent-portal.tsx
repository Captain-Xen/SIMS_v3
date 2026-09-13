'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HeartHandshake, GraduationCap, BookOpen, CalendarCheck, Wallet,
  Megaphone, ClipboardList, Loader2, CheckCircle2, Clock, AlertCircle,
  CalendarDays, Phone, Mail, MapPin, TrendingUp, Award,
} from 'lucide-react'
import { api, timeAgo, gradeToForm, scoreToLetter } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student, Grade, Attendance, Fee, Announcement, Assignment } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../user-avatar'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Letter grade → color (recharts bars)
function letterColor(letter: string): string {
  if (letter.startsWith('A')) return 'var(--chart-1)'
  if (letter.startsWith('B')) return '#14b8a6'
  if (letter.startsWith('C')) return '#f59e0b'
  if (letter.startsWith('D')) return '#f97316'
  return '#ef4444'
}

export function ParentPortalView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [student, setStudent] = useState<Student | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [todayAtt, setTodayAtt] = useState<Attendance | null>(null)
  const [attRate, setAttRate] = useState<number | null>(null)
  const [fee, setFee] = useState<Fee | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const today = todayStr()
        const [stuRes, gRes, attRes, feeRes, anRes, asRes] = await Promise.all([
          api<{ students: Student[] }>('/api/students'),
          api<{ grades: Grade[] }>('/api/grades', { query: { studentId: user.id } }),
          api<{ attendance: Attendance[] }>('/api/attendance', { query: { date: today } }),
          api<{ fees: Fee[] }>('/api/fees'),
          api<{ announcements: Announcement[] }>('/api/announcements'),
          api<{ assignments: Assignment[] }>('/api/assignments'),
        ])
        if (!active) return
        // Find own student record (for guardian + admissionNo)
        setStudent(stuRes.students.find((s) => s.id === user.id) ?? null)
        setGrades(gRes.grades)
        // Today's attendance filtered to this student
        setTodayAtt(attRes.attendance.find((a) => a.studentId === user.id) ?? null)
        // Attendance rate: derive from this student's most recent records if available.
        // The /api/attendance endpoint only returns the queried date, so we approximate using today's status.
        if (attRes.attendance.length > 0) {
          const me = attRes.attendance.find((a) => a.studentId === user.id)
          if (me) {
            // Simple per-student rate from the day's slice: present=100, late=50, absent=0
            const r = me.status === 'Present' ? 100 : me.status === 'Late' ? 75 : 0
            setAttRate(r)
          } else {
            setAttRate(null)
          }
        } else {
          setAttRate(null)
        }
        setFee(feeRes.fees.find((f) => f.studentId === user.id) ?? null)
        setAnnouncements(anRes.announcements.slice(0, 3))
        // Upcoming assignments: not yet submitted + due today or later
        const t = today
        const upcoming = asRes.assignments
          .filter((a) => a.dueDate >= t && a.submissionStatus !== 'Graded')
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
          .slice(0, 3)
        setAssignments(upcoming)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load portal', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, user.id])

  const guardianName = student?.guardian?.trim() || 'Parent / Guardian'

  // Academic snapshot
  const avg = useMemo(() => {
    if (grades.length === 0) return null
    return Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length)
  }, [grades])

  const chartData = useMemo(() => {
    return grades.map((g) => ({
      subject: g.subject.length > 10 ? g.subject.slice(0, 9) + '…' : g.subject,
      score: g.score,
      letter: scoreToLetter(g.score),
      color: letterColor(scoreToLetter(g.score)),
    }))
  }, [grades])

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
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
      {/* Welcome banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-foreground/90">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand/20" />
              {todayLabel}
            </p>
            <h2 className="mt-1.5 flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <HeartHandshake className="h-7 w-7" /> Parent Portal
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              Welcome, <span className="font-semibold">{guardianName}</span>. Here&apos;s an at-a-glance summary of
              {' '}{user.name.split(' ')[0]}&apos;s school progress.
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 p-3 text-center backdrop-blur ring-1 ring-white/20">
            <p className="text-[11px] uppercase tracking-wide text-brand-foreground/80">Today&apos;s Status</p>
            <p className="mt-0.5 text-lg font-bold">
              {todayAtt ? todayAtt.status : 'Not recorded'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Student summary card */}
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <UserAvatar name={user.name} avatar={user.avatar} role={user.role} size="xl" />
          <div className="flex-1">
            <h3 className="font-serif text-xl font-bold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">
                <GraduationCap className="mr-1 h-3 w-3" /> {gradeToForm(user.grade)}
              </Badge>
              {user.className && (
                <Badge variant="outline">Class {user.className}</Badge>
              )}
              {student?.admissionNo && (
                <Badge variant="outline">Adm. #{student.admissionNo}</Badge>
              )}
              {student?.phone && (
                <Badge variant="outline">
                  <Phone className="mr-1 h-3 w-3" /> {student.phone}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot grid: academic + attendance + fees */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Academic snapshot */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-brand" /> Academic Snapshot
              </CardTitle>
              <CardDescription>Current term subject scores</CardDescription>
            </div>
            {avg !== null && (
              <div className="text-right">
                <p className="text-2xl font-bold text-brand">{avg}%</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-40" />
                <p className="text-sm">No grades recorded yet this term.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                      formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.letter})`, 'Score']}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {grades.slice(0, 6).map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                      <span className="truncate text-xs font-medium">{g.subject}</span>
                      <span className="ml-2 shrink-0 text-xs font-bold" style={{ color: letterColor(scoreToLetter(g.score)) }}>
                        {scoreToLetter(g.score)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attendance + Fees side column */}
        <div className="space-y-6">
          {/* Attendance summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-brand" /> Attendance Today
              </CardTitle>
              <CardDescription>{todayLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayAtt ? (
                <>
                  <div className={cn(
                    'flex items-center justify-center rounded-xl py-4 text-lg font-bold',
                    todayAtt.status === 'Present' && 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
                    todayAtt.status === 'Late' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                    todayAtt.status === 'Absent' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                  )}>
                    {todayAtt.status === 'Present' && <CheckCircle2 className="mr-2 h-5 w-5" />}
                    {todayAtt.status === 'Late' && <Clock className="mr-2 h-5 w-5" />}
                    {todayAtt.status === 'Absent' && <AlertCircle className="mr-2 h-5 w-5" />}
                    {todayAtt.status}
                  </div>
                  {attRate !== null && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Attendance rate</span>
                        <span className="font-semibold text-foreground">{attRate}%</span>
                      </div>
                      <Progress value={attRate} className="mt-1 h-2" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <CalendarCheck className="h-8 w-8 opacity-40" />
                  <p className="text-xs">Attendance not yet recorded today.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fee status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-brand" /> Fee Status
              </CardTitle>
              <CardDescription>Term {fee?.term ?? '—'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fee ? (
                <>
                  <div className={cn(
                    'rounded-xl border p-4',
                    fee.status === 'Paid'
                      ? 'border-brand/25 bg-brand/5 dark:border-brand/30 dark:bg-brand/10'
                      : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Amount Due</span>
                      <Badge className={cn(
                        fee.status === 'Paid'
                          ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                      )}>
                        {fee.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-2xl font-bold">${fee.amount.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due {new Date(fee.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {fee.status !== 'Paid' && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Please contact the finance office to arrange payment.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                  <Wallet className="h-8 w-8 opacity-40" />
                  <p className="text-xs">No fee record on file.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Announcements + Assignments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-brand" /> Recent Announcements
            </CardTitle>
            <CardDescription>Latest news from the school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Megaphone className="h-8 w-8 opacity-40" />
                <p className="text-xs">No announcements yet.</p>
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 transition hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-brand">— {a.authorName}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-brand" /> Upcoming Assignments
            </CardTitle>
            <CardDescription>Next assignments due</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-40" />
                <p className="text-xs">No upcoming assignments. Great work staying on top of things!</p>
              </div>
            ) : (
              assignments.map((a) => {
                const due = new Date(a.dueDate + 'T00:00:00')
                const days = Math.ceil((due.getTime() - Date.now()) / 86400000)
                const urgent = days <= 2
                return (
                  <div key={a.id} className={cn(
                    'rounded-lg border p-3 transition',
                    urgent ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-border hover:bg-muted/40',
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.subject} · Class {a.className}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('shrink-0', urgent && 'border-amber-400 text-amber-700 dark:text-amber-300')}>
                        {days < 0 ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="mx-1">·</span>
                      <TrendingUp className="h-3 w-3" />
                      {a.teacherName}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Encouragement footer card */}
      <Card className="border-brand/25 bg-brand/5 dark:border-brand/40 dark:bg-brand/10">
        <CardContent className="flex items-start gap-3 p-5">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-brand-strong dark:text-brand">
              {avg !== null && avg >= 75
                ? 'Excellent progress — keep up the great work!'
                : avg !== null && avg >= 50
                  ? 'Steady progress — a little more focus will go a long way.'
                  : avg !== null
                    ? 'Extra support at home can make a real difference this term.'
                    : 'Encourage consistent attendance and homework to see results.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Have questions? Reach out to the class teacher or front office using the details below.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> office@educenterjm.edu</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> (876) 555-0190</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 12 Knutsford Boulevard, Kingston 5</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
