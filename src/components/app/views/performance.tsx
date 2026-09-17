'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Star, Plus, Eye, Pencil, Trash2, TrendingUp, Award, Loader2, X, Send,
  Search, Users, MessageSquare, Target, ArrowRight,
} from 'lucide-react'
import { api, timeAgo, initials } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { PerformanceReview, Staff, Term } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'

const STAFF_MANAGERS = ['Admin', 'Principal']

const CATEGORIES = [
  { key: 'teaching', label: 'Teaching' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'studentEngagement', label: 'Student Engagement' },
] as const

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

function scoreColor(score: number): string {
  if (score >= 5) return 'var(--chart-1)'
  if (score >= 4) return '#14b8a6'
  if (score >= 3) return '#f59e0b'
  return '#ef4444'
}

function scoreBadgeClass(score: number): string {
  if (score >= 5) return 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand'
  if (score >= 4) return 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
  if (score >= 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
  return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
}

function StarRating({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(sz, n <= value ? 'fill-amber-400 text-amber-400' : 'fill-none text-muted-foreground/40')}
        />
      ))}
    </span>
  )
}

export function PerformanceView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<PerformanceReview | null>(null)
  const [viewing, setViewing] = useState<PerformanceReview | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const isManager = STAFF_MANAGERS.includes(user.role)
  const isTeacher = user.role === 'Teacher'

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [rRes, stRes, tRes] = await Promise.all([
          api<{ reviews: PerformanceReview[] }>('/api/performance'),
          api<{ staff: Staff[] }>('/api/staff'),
          api<{ terms: Term[] }>('/api/terms'),
        ])
        if (!active) return
        setReviews(rRes.reviews)
        setStaff(stRes.staff)
        setTerms(tRes.terms)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load reviews', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const activeTerm = useMemo(() => terms.find((t) => t.isActive), [terms])

  const stats = useMemo(() => {
    const total = reviews.length
    const avg = total ? reviews.reduce((a, r) => a + r.rating, 0) / total : 0
    // Top performer: highest average rating by subjectId
    const bySubject = new Map<string, { name: string; sum: number; count: number }>()
    for (const r of reviews) {
      const e = bySubject.get(r.subjectId) ?? { name: r.subjectName, sum: 0, count: 0 }
      e.sum += r.rating
      e.count += 1
      bySubject.set(r.subjectId, e)
    }
    let topName = '—'
    let topAvg = 0
    for (const [, v] of bySubject.entries()) {
      const a = v.sum / v.count
      if (a > topAvg) { topAvg = a; topName = v.name }
    }
    // Reviews this term: createdAt within active term date range, else last 120 days
    let thisTerm = 0
    if (activeTerm) {
      const s = new Date(activeTerm.startDate).getTime()
      const e = new Date(activeTerm.endDate).getTime()
      thisTerm = reviews.filter((r) => {
        const c = new Date(r.createdAt).getTime()
        return c >= s && c <= e
      }).length
    } else {
      const cutoff = Date.now() - 120 * 86400000
      thisTerm = reviews.filter((r) => new Date(r.createdAt).getTime() >= cutoff).length
    }
    return { total, avg, topName, topAvg, thisTerm }
  }, [reviews, activeTerm])

  // Category averages across all reviews (for staff overview bar chart)
  const categoryAverages = useMemo(() => {
    if (reviews.length === 0) return []
    return CATEGORIES.map((c) => ({
      category: c.label,
      avg: Number((reviews.reduce((a, r) => a + (r as any)[c.key], 0) / reviews.length).toFixed(2)),
    }))
  }, [reviews])

  // Teacher: their own reviews (backend already filters to own, but double-filter client-side)
  const myReviews = useMemo(() => {
    if (!isTeacher) return reviews
    return reviews.filter((r) => r.subjectId === user.id)
  }, [reviews, isTeacher, user.id])

  const myAverages = useMemo(() => {
    if (myReviews.length === 0) return []
    return CATEGORIES.map((c) => ({
      category: c.label,
      value: Number((myReviews.reduce((a, r) => a + (r as any)[c.key], 0) / myReviews.length).toFixed(2)),
    }))
  }, [myReviews])

  const myAvgRating = myReviews.length ? myReviews.reduce((a, r) => a + r.rating, 0) / myReviews.length : 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reviews
    return reviews.filter(
      (r) =>
        r.subjectName.toLowerCase().includes(q) ||
        r.period.toLowerCase().includes(q) ||
        r.reviewerName.toLowerCase().includes(q)
    )
  }, [reviews, search])

  async function refresh() {
    try {
      const res = await api<{ reviews: PerformanceReview[] }>('/api/performance')
      setReviews(res.reviews)
    } catch { /* ignore */ }
  }

  async function onDelete(r: PerformanceReview) {
    if (!confirm(`Delete review for ${r.subjectName} (${r.period})? This cannot be undone.`)) return
    setDeleting(r.id)
    try {
      await api(`/api/performance/${r.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Review deleted', body: `Review for ${r.subjectName} was removed.` })
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

  const selectableStaff = staff.filter((s) => ['Teacher', 'Admin', 'Principal'].includes(s.role))

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <Star className="h-7 w-7" /> Staff Performance
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              Teacher evaluations, performance metrics, and professional development.
            </p>
          </div>
          {isManager && (
            <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Add Review
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Award} label="Total Reviews" value={String(stats.total)} sub="on record" color="emerald" />
        <StatCard icon={TrendingUp} label="Average Rating" value={stats.total ? stats.avg.toFixed(1) : '—'} sub="out of 5" color="teal" />
        <StatCard icon={Star} label="Top Performer" value={stats.topName} sub={stats.topAvg ? `${stats.topAvg.toFixed(1)} avg` : 'no data'} color="amber" />
        <StatCard icon={Users} label="Reviews This Term" value={String(stats.thisTerm)} sub={activeTerm ? activeTerm.name : 'last 120 days'} color="cyan" />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isTeacher ? (
        <TeacherView reviews={myReviews} myAverages={myAverages} myAvgRating={myAvgRating} />
      ) : isManager ? (
        <>
          {/* Performance overview bar chart */}
          {categoryAverages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-brand" /> Performance Overview
                </CardTitle>
                <CardDescription>Average scores per category across all reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryAverages} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                    <Bar dataKey="avg" name="Avg Score" radius={[6, 6, 0, 0]}>
                      {categoryAverages.map((d, i) => (
                        <Cell key={i} fill={scoreColor(d.avg)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Reviews table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4 text-brand" /> All Reviews
                  </CardTitle>
                  <CardDescription>
                    {reviews.length} performance {reviews.length === 1 ? 'review' : 'reviews'} on file
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reviews…"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Award className="h-8 w-8 opacity-40" />
                  <p className="text-sm">
                    {reviews.length === 0 ? 'No performance reviews yet.' : 'No reviews match your search.'}
                  </p>
                  {reviews.length === 0 && (
                    <Button onClick={() => setAdding(true)} className="bg-brand text-brand-foreground hover:bg-brand-strong">
                      <Plus className="h-4 w-4" /> Add First Review
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Staff</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Period</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Overall</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Teach</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Punct</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Prof</th>
                        <th className="whitespace-nowrap pb-2 pr-3 font-medium">Engage</th>
                        <th className="whitespace-nowrap pb-2 pr-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const st = staff.find((s) => s.id === r.subjectId)
                        const isDel = deleting === r.id
                        return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {st?.avatar && <AvatarImage src={st.avatar} alt={r.subjectName} />}
                                  <AvatarFallback className="bg-brand/10 text-xs font-semibold text-brand-strong dark:bg-brand/15 dark:text-brand">
                                    {initials(r.subjectName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{r.subjectName}</p>
                                  <p className="truncate text-[10px] text-muted-foreground">{r.subjectRole}</p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap py-3 pr-3 text-xs text-muted-foreground">{r.period}</td>
                            <td className="py-3 pr-3">
                              <span className="inline-flex items-center gap-1.5">
                                <StarRating value={r.rating} />
                                <span className="text-xs font-semibold">{r.rating.toFixed(1)}</span>
                              </span>
                            </td>
                            <td className="py-3 pr-3"><ScoreBadge value={r.teaching} /></td>
                            <td className="py-3 pr-3"><ScoreBadge value={r.punctuality} /></td>
                            <td className="py-3 pr-3"><ScoreBadge value={r.professionalism} /></td>
                            <td className="py-3 pr-3"><ScoreBadge value={r.studentEngagement} /></td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(r)} title="View">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(r)} title="Edit">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                  onClick={() => onDelete(r)}
                                  disabled={isDel}
                                  title="Delete"
                                >
                                  {isDel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
      ) : (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
            <Star className="h-10 w-10 opacity-40" />
            <p className="text-sm">You do not have access to Staff Performance.</p>
          </CardContent>
        </Card>
      )}

      {adding && <ReviewDialog staff={selectableStaff} onClose={() => setAdding(false)} onSaved={onSaved} />}
      {editing && <ReviewDialog staff={selectableStaff} review={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {viewing && <ReviewDetailDialog review={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function TeacherView({
  reviews,
  myAverages,
  myAvgRating,
}: {
  reviews: PerformanceReview[]
  myAverages: { category: string; value: number }[]
  myAvgRating: number
}) {
  return (
    <>
      {/* My Performance summary */}
      <Card className="overflow-hidden border-brand/60 bg-gradient-to-br from-brand/10 to-brand/10 dark:border-brand/40 dark:from-brand/10 dark:to-brand/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-brand" /> My Performance
          </CardTitle>
          <CardDescription>Summary of your evaluations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Average</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-brand dark:text-brand">
                    {reviews.length ? myAvgRating.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                {reviews.length > 0 && <div className="mt-1"><StarRating value={Math.round(myAvgRating)} size="md" /></div>}
              </div>
              <Separator />
              <div className="space-y-2">
                {myAverages.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{c.category}</span>
                    <span className="font-semibold">{c.value.toFixed(1)}</span>
                  </div>
                ))}
                {myAverages.length === 0 && (
                  <p className="text-xs text-muted-foreground">No category data yet.</p>
                )}
              </div>
            </div>
            <div>
              {myAverages.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={myAverages}>
                    <PolarGrid stroke="rgba(0,0,0,0.1)" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Star className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My reviews list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-brand" /> My Reviews
          </CardTitle>
          <CardDescription>
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} on file
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Award className="h-8 w-8 opacity-40" />
              <p className="text-sm">No reviews have been recorded for you yet.</p>
            </div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{r.period}</p>
                      <p className="text-xs text-muted-foreground">
                        Reviewed by {r.reviewerName} · {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <StarRating value={r.rating} />
                      <span className="text-xs font-semibold">{r.rating.toFixed(1)}</span>
                    </span>
                  </div>
                  {r.comments && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Comments:</span> {r.comments}
                    </p>
                  )}
                  {r.goals && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Goals:</span> {r.goals}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function ScoreBadge({ value }: { value: number }) {
  return (
    <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold', scoreBadgeClass(value))}>
      {value.toFixed(1)}
    </span>
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
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/5">
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="mt-3 truncate text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-semibold text-brand dark:text-brand">{sub}</p>
      </CardContent>
    </Card>
  )
}

function ReviewDialog({
  staff,
  review,
  onClose,
  onSaved,
}: {
  staff: Staff[]
  review?: PerformanceReview
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [subjectId, setSubjectId] = useState(review?.subjectId ?? '')
  const [period, setPeriod] = useState(review?.period ?? '')
  const [rating, setRating] = useState(review ? String(review.rating) : '4')
  const [teaching, setTeaching] = useState(review ? String(review.teaching) : '4')
  const [punctuality, setPunctuality] = useState(review ? String(review.punctuality) : '4')
  const [professionalism, setProfessionalism] = useState(review ? String(review.professionalism) : '4')
  const [studentEngagement, setStudentEngagement] = useState(review ? String(review.studentEngagement) : '4')
  const [comments, setComments] = useState(review?.comments ?? '')
  const [goals, setGoals] = useState(review?.goals ?? '')

  async function save() {
    if (!subjectId || !period.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please select a staff member and enter a period.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        subjectId,
        period: period.trim(),
        rating: Number(rating),
        teaching: Number(teaching),
        punctuality: Number(punctuality),
        professionalism: Number(professionalism),
        studentEngagement: Number(studentEngagement),
        comments: comments.trim() || null,
        goals: goals.trim() || null,
      }
      if (review) {
        await api(`/api/performance/${review.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Review updated', body: 'Performance review was saved.' })
      } else {
        await api('/api/performance', { method: 'POST', body })
        addToast({ type: 'success', title: 'Review added', body: 'Performance review was created.' })
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
            <Star className="h-4 w-4 text-brand" /> {review ? 'Edit Review' : 'Add Performance Review'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff Member *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                <SelectContent>
                  {staff.length === 0 ? (
                    <SelectItem value="none" disabled>No eligible staff</SelectItem>
                  ) : (
                    staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Period *</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Michaelmas 2025" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} — {RATING_LABELS[n - 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Target className="h-4 w-4 text-brand" /> Category Scores (1–5)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <CategorySelect label="Teaching" value={teaching} onChange={setTeaching} />
              <CategorySelect label="Punctuality" value={punctuality} onChange={setPunctuality} />
              <CategorySelect label="Professionalism" value={professionalism} onChange={setProfessionalism} />
              <CategorySelect label="Student Engagement" value={studentEngagement} onChange={setStudentEngagement} />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Strengths, observations, areas of note…"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goals</Label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="Development goals for next period…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {review ? 'Save Changes' : 'Add Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CategorySelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {[5, 4, 3, 2, 1].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} — {RATING_LABELS[n - 1]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ReviewDetailDialog({ review, onClose }: { review: PerformanceReview; onClose: () => void }) {
  const radarData = [
    { category: 'Teaching', value: review.teaching },
    { category: 'Punctuality', value: review.punctuality },
    { category: 'Professionalism', value: review.professionalism },
    { category: 'Student Engagement', value: review.studentEngagement },
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand" /> Performance Review
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff Member</p>
              <p className="mt-0.5 font-semibold">{review.subjectName}</p>
              <p className="text-xs text-muted-foreground">{review.subjectRole}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Period</p>
              <p className="mt-0.5 font-semibold">{review.period}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reviewer</p>
              <p className="mt-0.5 font-semibold">{review.reviewerName}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Rating</p>
              <div className="mt-0.5 flex items-center gap-2">
                <StarRating value={review.rating} size="md" />
                <span className="font-semibold">{review.rating.toFixed(1)} / 5</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Category Breakdown</p>
              <div className="space-y-2">
                {radarData.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{c.category}</span>
                    <ScoreBadge value={c.value} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.1)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(review.comments || review.goals) && (
            <>
              <Separator />
              {review.comments && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> Comments
                  </p>
                  <p className="text-sm leading-relaxed">{review.comments}</p>
                </div>
              )}
              {review.goals && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Target className="h-3.5 w-3.5" /> Goals
                  </p>
                  <p className="text-sm leading-relaxed">{review.goals}</p>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
