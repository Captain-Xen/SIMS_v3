'use client'

import { useEffect, useState } from 'react'
import {
  Users, GraduationCap, DollarSign, TrendingUp, CalendarDays, Megaphone,
  ChevronLeft, ChevronRight, ArrowRight, CheckCircle2, Clock, AlertCircle, BookOpen, Award,
  Zap, Library, MessageSquare, ClipboardList, FileText, Bell, BookMarked,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { isFeatureEnabled } from '@/lib/features'
import type { Announcement, CalendarEvent, Loan } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts'

const EVENT_COLORS: Record<string, string> = {
  Exam: '#ef4444', Event: 'var(--chart-1)', Holiday: '#8b5cf6', Meeting: '#f59e0b',
}

export function DashboardView() {
  const user = useAppStore((s) => s.user)!
  const setActiveView = useAppStore((s) => s.setActiveView)
  const addToast = useAppStore((s) => s.addToast)
  const features = useAppStore((s) => s.settings?.features)

  const [stats, setStats] = useState({ students: 0, staff: 0, feesCollected: 0, feesPending: 0, present: 0, absent: 0, late: 0, totalFees: 0 })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calMonth, setCalMonth] = useState(new Date())
  const [gradeDist, setGradeDist] = useState<{ subject: string; avg: number }[]>([])
  const [loans, setLoans] = useState<Loan[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [sRes, stRes, aRes, eRes, fRes, attRes, gRes, lRes] = await Promise.all([
          api<{ students: any[] }>('/api/students'),
          api<{ staff: any[] }>('/api/staff'),
          api<{ announcements: Announcement[] }>('/api/announcements'),
          api<{ events: CalendarEvent[] }>('/api/events'),
          api<{ fees: any[] }>('/api/fees'),
          api<{ attendance: any[] }>('/api/attendance'),
          api<{ grades: any[] }>('/api/grades'),
          api<{ loans: Loan[] }>('/api/loans'),
        ])
        if (!active) return
        setLoans(lRes.loans.filter((l) => l.status !== 'Returned'))
        const present = attRes.attendance.filter((a) => a.status === 'Present').length
        const absent = attRes.attendance.filter((a) => a.status === 'Absent').length
        const late = attRes.attendance.filter((a) => a.status === 'Late').length
        const total = attRes.attendance.length || 1
        const collected = fRes.fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
        const pending = fRes.fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
        setStats({
          students: sRes.students.length,
          staff: stRes.staff.length,
          feesCollected: collected,
          feesPending: pending,
          present: Math.round((present / total) * 100),
          absent: Math.round((absent / total) * 100),
          late: Math.round((late / total) * 100),
          totalFees: collected + pending,
        })
        setAnnouncements(aRes.announcements.slice(0, 4))
        setEvents(eRes.events)
        // grade distribution by subject
        const bySubject = new Map<string, number[]>()
        for (const g of gRes.grades) {
          if (!bySubject.has(g.subject)) bySubject.set(g.subject, [])
          bySubject.get(g.subject)!.push(g.score)
        }
        setGradeDist(Array.from(bySubject.entries()).map(([subject, scores]) => ({ subject: subject.length > 10 ? subject.slice(0, 9) + '…' : subject, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) })))
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load dashboard', body: e.message })
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const isStudent = user.role === 'Student'
  const isStaff = !isStudent

  // calendar grid
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const today = new Date()
  const monthName = calMonth.toLocaleString('default', { month: 'long' })

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.date === dateStr)
  }

  const attendanceData = [
    { name: 'Present', value: stats.present, color: 'var(--chart-1)' },
    { name: 'Late', value: stats.late, color: '#f59e0b' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
  ].filter((d) => d.value > 0)

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
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h2 className="mt-1.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              {isStudent ? "Here's what's happening in your classes today." : "Here's your school overview at a glance."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!isStudent && isFeatureEnabled(features, 'students') && (
              <Button onClick={() => setActiveView('students')} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <Users className="h-4 w-4" /> View Students
              </Button>
            )}
            {isStudent && isFeatureEnabled(features, 'assignments') && (
              <Button onClick={() => setActiveView('assignments')} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <BookOpen className="h-4 w-4" /> My Assignments
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={String(stats.students)} trend="+12 this term" color="emerald" onClick={() => setActiveView('students')} />
        {isStaff ? (
          <StatCard icon={GraduationCap} label="Staff Members" value={String(stats.staff)} trend="All active" color="teal" onClick={() => setActiveView('staff')} />
        ) : (
          <StatCard icon={BookOpen} label="My Subjects" value="3" trend="Term 1" color="teal" onClick={() => setActiveView('grades')} />
        )}
        <StatCard icon={DollarSign} label="Fees Collected" value={`$${stats.feesCollected.toLocaleString()}`} trend={`of $${stats.totalFees.toLocaleString()}`} color="amber" onClick={() => setActiveView('fees')} />
        <StatCard icon={CheckCircle2} label="Attendance Today" value={`${stats.present}%`} trend={`${stats.late}% late`} color="cyan" onClick={() => setActiveView('attendance')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Grade distribution chart */}
          {isStaff && gradeDist.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Grade Distribution by Subject</CardTitle>
                  <CardDescription>Average scores across all students</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveView('grades')}>View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gradeDist}>
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                    <Bar dataKey="avg" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-brand" /> Announcements</CardTitle>
                <CardDescription>Latest news from the school</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('announcements')}>View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No announcements yet.</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3 transition hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                    <p className="mt-2 text-xs font-medium text-brand">— {a.authorName}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-amber-500" /> Quick Actions</CardTitle>
              <CardDescription>Jump to common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {isStudent ? (
                  <>
                    {isFeatureEnabled(features, 'grades') && <QuickAction icon={ClipboardList} label="My Grades" color="emerald" onClick={() => setActiveView('grades')} />}
                    {isFeatureEnabled(features, 'assignments') && <QuickAction icon={BookOpen} label="Assignments" color="teal" onClick={() => setActiveView('assignments')} />}
                    {isFeatureEnabled(features, 'library') && <QuickAction icon={Library} label="Borrow Book" color="amber" onClick={() => setActiveView('library')} />}
                    {isFeatureEnabled(features, 'reports') && <QuickAction icon={FileText} label="Reports" color="cyan" onClick={() => setActiveView('reports')} />}
                  </>
                ) : (
                  <>
                    {isFeatureEnabled(features, 'students') && <QuickAction icon={Users} label="Students" color="emerald" onClick={() => setActiveView('students')} />}
                    {isFeatureEnabled(features, 'grades') && <QuickAction icon={ClipboardList} label="Grades" color="teal" onClick={() => setActiveView('grades')} />}
                    {isFeatureEnabled(features, 'announcements') && <QuickAction icon={Megaphone} label="Announce" color="amber" onClick={() => setActiveView('announcements')} />}
                    {isFeatureEnabled(features, 'reports') && <QuickAction icon={FileText} label="Reports" color="cyan" onClick={() => setActiveView('reports')} />}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Attendance donut */}
          {isStaff && attendanceData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Attendance Today</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={attendanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {attendanceData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Calendar */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand" /> {monthName} {year}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalMonth(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[10px] font-medium text-muted-foreground">{d}</div>)}
                {cells.map((day, i) => {
                  if (day === null) return <div key={i} />
                  const dayEvents = eventsForDay(day)
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                  return (
                    <div
                      key={i}
                      className={cn(
                        'relative flex aspect-square items-center justify-center rounded-md text-xs transition',
                        isToday ? 'bg-brand font-bold text-white' : 'hover:bg-muted',
                      )}
                    >
                      {day}
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                          {dayEvents.slice(0, 3).map((e, j) => <span key={j} className="h-1 w-1 rounded-full" style={{ background: isToday ? '#fff' : EVENT_COLORS[e.type] || 'var(--chart-1)' }} />)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <Separator />
              <div className="mt-3 space-y-1.5">
                {events.slice(0, 4).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: EVENT_COLORS[e.type] || 'var(--chart-1)' }} />
                    <span className="flex-1 truncate font-medium">{e.title}</span>
                    <span className="text-muted-foreground">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Library due dates */}
          {loans.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><BookMarked className="h-4 w-4 text-brand" /> Library Due Dates</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveView('library')}>All <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loans.slice(0, 4).map((l) => {
                  const overdue = l.status === 'Overdue'
                  const due = new Date(l.dueDate)
                  const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000)
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', overdue ? 'bg-red-100 text-red-600 dark:bg-red-950/50' : daysLeft <= 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : 'bg-brand/10 text-brand dark:bg-brand/15')}>
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.bookTitle}</p>
                        <p className="text-xs text-muted-foreground">Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <Badge variant="outline" className={cn('shrink-0 text-xs', overdue ? 'border-red-300 text-red-600' : daysLeft <= 3 ? 'border-amber-300 text-amber-600' : 'border-brand/35 text-brand')}>
                        {overdue ? 'Overdue' : daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, trend, color, onClick }: { icon: any; label: string; value: string; trend: string; color: string; onClick?: () => void }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5" onClick={onClick}>
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-brand/5 to-brand/5 transition group-hover:from-brand/10 group-hover:to-brand/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}><Icon className="h-5 w-5" /></div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-brand dark:text-brand">{trend}</p>
      </CardContent>
    </Card>
  )
}

function Separator() {
  return <div className="my-3 h-px bg-border" />
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/5 text-brand-strong group-hover:bg-brand/10 dark:bg-brand/10 dark:text-brand',
    teal: 'bg-teal-50 text-teal-700 group-hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-300',
    amber: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300',
    cyan: 'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300',
  }
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-md"
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition', colors[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
