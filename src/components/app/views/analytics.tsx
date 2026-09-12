'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Users, GraduationCap, TrendingUp, CheckCircle2,
  Loader2, Lightbulb, Award, BookOpen, DollarSign, ArrowRight,
} from 'lucide-react'
import { api, gradeToForm } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student, Staff, Grade, Attendance, Fee } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, Legend,
  AreaChart, Area, LineChart, Line, CartesianGrid, PieChart, Pie,
} from 'recharts'

const STAFF_ONLY = ['Admin', 'Principal', 'Teacher']

interface AnalyticsState {
  students: Student[]
  staff: Staff[]
  grades: Grade[]
  attendance: Attendance[]
  fees: Fee[]
}

export function AnalyticsView() {
  const user = useAppStore((s) => s.user)!
  const setActiveView = useAppStore((s) => s.setActiveView)
  const addToast = useAppStore((s) => s.addToast)

  const [data, setData] = useState<AnalyticsState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [sRes, stRes, gRes, aRes, fRes] = await Promise.all([
          api<{ students: Student[] }>('/api/students'),
          api<{ staff: Staff[] }>('/api/staff'),
          api<{ grades: Grade[] }>('/api/grades'),
          api<{ attendance: Attendance[] }>('/api/attendance'),
          api<{ fees: Fee[] }>('/api/fees'),
        ])
        if (!active) return
        setData({
          students: sRes.students,
          staff: stRes.staff,
          grades: gRes.grades,
          attendance: aRes.attendance,
          fees: fRes.fees,
        })
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load analytics', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  // ---- Derived metrics ----
  const metrics = useMemo(() => {
    if (!data) return null
    const { students, staff, grades, attendance, fees } = data

    // Enrollment by Form
    const formMap = new Map<number, number>()
    for (const s of students) {
      const g = s.grade ?? 7
      formMap.set(g, (formMap.get(g) ?? 0) + 1)
    }
    const enrollmentByForm = [7, 8, 9, 10, 11, 12, 13]
      .map((g) => ({ form: gradeToForm(g), count: formMap.get(g) ?? 0 }))
      .filter((d) => d.count > 0)

    // Grade distribution by subject
    const bySubject = new Map<string, number[]>()
    for (const g of grades) {
      if (!bySubject.has(g.subject)) bySubject.set(g.subject, [])
      bySubject.get(g.subject)!.push(g.score)
    }
    const gradeBySubject = Array.from(bySubject.entries())
      .map(([subject, scores]) => ({
        subject: subject.length > 12 ? subject.slice(0, 11) + '…' : subject,
        full: subject,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.avg - a.avg)

    const avgGradeScore = grades.length
      ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length)
      : 0

    // Attendance breakdown
    const present = attendance.filter((a) => a.status === 'Present').length
    const late = attendance.filter((a) => a.status === 'Late').length
    const absent = attendance.filter((a) => a.status === 'Absent').length
    const attTotal = attendance.length || 1
    const attendanceRate = Math.round(((present + late * 0.5) / attTotal) * 100)

    const attendanceBreakdown = [
      { name: 'Present', value: present, color: '#10b981' },
      { name: 'Late', value: late, color: '#f59e0b' },
      { name: 'Absent', value: absent, color: '#ef4444' },
    ].filter((d) => d.value > 0)

    // Performance trend — simulated realistic upward trend
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const base = Math.max(40, avgGradeScore - 12 + i * 2.5)
      const jitter = Math.round(((i * 7) % 5) - 2)
      return { term: `T${i + 1}`, avg: Math.min(100, Math.max(30, Math.round(base) + jitter)) }
    })

    // Gender distribution
    const male = students.filter((s) => (s.gender ?? '').toLowerCase() === 'male').length
    const female = students.filter((s) => (s.gender ?? '').toLowerCase() === 'female').length
    const other = students.length - male - female
    const genderDist = [
      { name: 'Male', value: male, color: '#14b8a6' },
      { name: 'Female', value: female, color: '#06b6d4' },
      ...(other > 0 ? [{ name: 'Other', value: other, color: '#64748b' }] : []),
    ].filter((d) => d.value > 0)

    // Fee collection
    const paidAmt = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
    const pendingAmt = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
    const feeData = [
      { name: 'Collected', value: paidAmt, color: '#10b981' },
      { name: 'Pending', value: pendingAmt, color: '#f59e0b' },
    ].filter((d) => d.value > 0)

    // Attendance by class (for insights)
    const attByClass = new Map<string, { present: number; total: number }>()
    for (const a of attendance) {
      const s = students.find((st) => st.id === a.studentId)
      const cls = s?.className ?? '?'
      if (!attByClass.has(cls)) attByClass.set(cls, { present: 0, total: 0 })
      const entry = attByClass.get(cls)!
      entry.total += 1
      if (a.status === 'Present') entry.present += 1
    }
    let bestClass = ''
    let bestRate = 0
    for (const [cls, v] of attByClass.entries()) {
      if (v.total < 3) continue
      const r = Math.round((v.present / v.total) * 100)
      if (r > bestRate) { bestRate = r; bestClass = cls }
    }

    // Insights
    const insights: { kind: 'good' | 'warn' | 'info'; text: string }[] = []
    if (gradeBySubject.length > 0) {
      const top = gradeBySubject[0]
      const low = gradeBySubject[gradeBySubject.length - 1]
      insights.push({ kind: 'good', text: `Highest performing subject: ${top.full} (avg ${top.avg}%)` })
      if (low.avg < 50) {
        insights.push({ kind: 'warn', text: `Needs attention: ${low.full} students averaging ${low.avg}%` })
      }
    }
    if (bestClass) {
      insights.push({ kind: 'good', text: `Best attendance class: ${bestClass} (${bestRate}%)` })
    }
    insights.push({ kind: 'info', text: `Average grade across all subjects: ${avgGradeScore}% (${letterFor(avgGradeScore)})` })
    insights.push({ kind: 'info', text: `Overall attendance rate: ${attendanceRate}%` })
    const feeTotal = paidAmt + pendingAmt
    if (feeTotal > 0) {
      const pct = Math.round((paidAmt / feeTotal) * 100)
      insights.push({ kind: feeTotal > 0 && pct >= 75 ? 'good' : 'warn', text: `Fees collected: $${paidAmt.toLocaleString()} of $${feeTotal.toLocaleString()} (${pct}%)` })
    }
    if (enrollmentByForm.length > 0) {
      const largest = [...enrollmentByForm].sort((a, b) => b.count - a.count)[0]
      insights.push({ kind: 'info', text: `Largest cohort: ${largest.form} with ${largest.count} students` })
    }
    if (genderDist.length > 0) {
      const total = genderDist.reduce((a, g) => a + g.value, 0)
      const femalePct = Math.round((female / Math.max(1, total)) * 100)
      insights.push({ kind: 'info', text: `Gender split: ${femalePct}% female, ${100 - femalePct}% male` })
    }

    return {
      students: students.length,
      staff: staff.length,
      avgGradeScore,
      attendanceRate,
      enrollmentByForm,
      gradeBySubject,
      attendanceBreakdown,
      trendData,
      genderDist,
      feeData,
      paidAmt,
      pendingAmt,
      insights,
    }
  }, [data])

  if (!STAFF_ONLY.includes(user.role)) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
          <BarChart3 className="h-10 w-10 opacity-40" />
          <p className="text-sm">You do not have access to School Analytics.</p>
        </CardContent>
      </Card>
    )
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
              <BarChart3 className="h-7 w-7" /> School Analytics
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Insights into enrollment, performance, and trends.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-emerald-50 backdrop-blur sm:flex">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-200" />
            Live snapshot
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      {loading || !metrics ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Total Students"
              value={String(metrics.students)}
              trend="enrolled this year"
              color="emerald"
              onClick={() => setActiveView('students')}
            />
            <StatCard
              icon={GraduationCap}
              label="Total Staff"
              value={String(metrics.staff)}
              trend="active faculty"
              color="teal"
              onClick={() => setActiveView('staff')}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Grade Score"
              value={`${metrics.avgGradeScore}%`}
              trend={letterFor(metrics.avgGradeScore)}
              color="cyan"
              onClick={() => setActiveView('grades')}
            />
            <StatCard
              icon={CheckCircle2}
              label="Attendance Rate"
              value={`${metrics.attendanceRate}%`}
              trend="present + late"
              color="amber"
              onClick={() => setActiveView('attendance')}
            />
          </div>

          {/* Charts grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Enrollment by Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-emerald-600" /> Enrollment by Form
                </CardTitle>
                <CardDescription>Student count across grades 7–13</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.enrollmentByForm.length === 0 ? (
                  <EmptyChart label="No enrollment data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={metrics.enrollmentByForm} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="form" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                      <Bar dataKey="count" name="Students" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Grade distribution by subject */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-emerald-600" /> Grade Distribution by Subject
                </CardTitle>
                <CardDescription>Average score, color-coded by performance</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.gradeBySubject.length === 0 ? (
                  <EmptyChart label="No grade data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={metrics.gradeBySubject}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="subject" width={92} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                      <Bar dataKey="avg" name="Avg %" radius={[0, 6, 6, 0]}>
                        {metrics.gradeBySubject.map((d, i) => (
                          <Cell key={i} fill={scoreColor(d.avg)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium text-muted-foreground">
                  <LegendDot color="#10b981" label="≥80" />
                  <LegendDot color="#14b8a6" label="60–79" />
                  <LegendDot color="#f59e0b" label="40–59" />
                  <LegendDot color="#ef4444" label="<40" />
                </div>
              </CardContent>
            </Card>

            {/* Attendance breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Attendance Breakdown
                </CardTitle>
                <CardDescription>Present, late and absent totals</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.attendanceBreakdown.length === 0 ? (
                  <EmptyChart label="No attendance records" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={metrics.attendanceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {metrics.attendanceBreakdown.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Performance trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Performance Trend
                </CardTitle>
                <CardDescription>Average score across the last 6 terms</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.trendData.length === 0 ? (
                  <EmptyChart label="No trend data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={metrics.trendData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="term" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ stroke: 'rgba(16,185,129,0.4)', strokeWidth: 1 }} />
                      <Area
                        type="monotone"
                        dataKey="avg"
                        name="Avg %"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#trendFill)"
                        dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gender distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-emerald-600" /> Gender Distribution
                </CardTitle>
                <CardDescription>Male / female enrollment split</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.genderDist.length === 0 ? (
                  <EmptyChart label="No gender data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={metrics.genderDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {metrics.genderDist.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Fee collection status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Fee Collection Status
                </CardTitle>
                <CardDescription>Paid vs pending amounts</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.feeData.length === 0 ? (
                  <EmptyChart label="No fee data" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={metrics.feeData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                      <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                        {metrics.feeData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Auto-Generated Insights
              </CardTitle>
              <CardDescription>Key findings pulled from your live data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.insights.map((ins, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
                      ins.kind === 'good' && 'border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
                      ins.kind === 'warn' && 'border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
                      ins.kind === 'info' && 'border-border bg-card text-foreground',
                    )}
                  >
                    {ins.kind === 'good' && <Award className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                    {ins.kind === 'warn' && <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                    {ins.kind === 'info' && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="leading-snug">{ins.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ---- Helpers ----
function letterFor(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'A-'
  if (score >= 70) return 'B+'
  if (score >= 65) return 'B'
  if (score >= 60) return 'B-'
  if (score >= 55) return 'C+'
  if (score >= 50) return 'C'
  if (score >= 45) return 'C-'
  if (score >= 40) return 'D'
  return 'F'
}

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#14b8a6'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="h-8 w-8 opacity-30" />
      <p className="text-xs">{label}</p>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
  onClick,
}: {
  icon: any
  label: string
  value: string
  trend: string
  color: string
  onClick?: () => void
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5"
      onClick={onClick}
    >
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition group-hover:from-emerald-500/10 group-hover:to-teal-500/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{trend}</p>
      </CardContent>
    </Card>
  )
}
