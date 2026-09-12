'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList, Plus, Loader2, BookOpen, CalendarClock, FileText, CheckCircle2,
  Clock, AlertCircle, Award, ClipboardCheck, GraduationCap,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Assignment } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']

type GroupVariant = 'amber' | 'red' | 'emerald'

export function AssignmentsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitFor, setSubmitFor] = useState<Assignment | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ assignments: Assignment[] }>('/api/assignments')
      setAssignments(res.assignments)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load assignments', body: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    load().then(() => { if (!active) return })
    return () => { active = false }
  }, [])

  const isStudent = user.role === 'Student'

  // Teacher view: only assignments they created
  const teacherAssignments = useMemo(() => {
    if (isStudent) return []
    return assignments.filter((a) => a.teacherId === user.id)
  }, [assignments, isStudent, user.id])

  // Student view: bucket by due date + submission state
  const studentGroups = useMemo(() => {
    const empty = { overdue: [] as Assignment[], dueSoon: [] as Assignment[], upcoming: [] as Assignment[], submitted: [] as Assignment[] }
    if (!isStudent) return empty
    const now = Date.now()
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000
    const groups = { ...empty }
    for (const a of assignments) {
      const due = new Date(a.dueDate).getTime()
      const status = a.submissionStatus
      if (status === 'Graded' || status === 'Submitted') {
        groups.submitted.push(a)
      } else if (due < now) {
        groups.overdue.push(a)
      } else if (due <= weekAhead) {
        groups.dueSoon.push(a)
      } else {
        groups.upcoming.push(a)
      }
    }
    return groups
  }, [assignments, isStudent])

  const stats = useMemo(() => {
    if (isStudent) {
      return {
        total: assignments.length,
        pending: assignments.filter((a) => !a.submissionStatus).length,
        graded: assignments.filter((a) => a.submissionStatus === 'Graded').length,
      }
    }
    return {
      total: teacherAssignments.length,
      pending: teacherAssignments.filter((a) => new Date(a.dueDate).getTime() < Date.now()).length,
      graded: new Set(teacherAssignments.map((a) => a.subject)).size,
    }
  }, [assignments, teacherAssignments, isStudent])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <ClipboardList className="h-5 w-5 text-emerald-600" /> Assignments
          </h2>
          <p className="text-sm text-muted-foreground">
            {isStudent ? 'Your assignments across all subjects.' : 'Assignments you have created for your classes.'}
          </p>
        </div>
        {!isStudent && (
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Assignment
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={ClipboardList} label={isStudent ? 'Total Assignments' : 'Created'} value={stats.total} color="emerald" />
        {isStudent ? (
          <>
            <StatTile icon={Clock} label="Pending Submission" value={stats.pending} color="amber" />
            <StatTile icon={Award} label="Graded" value={stats.graded} color="cyan" />
          </>
        ) : (
          <>
            <StatTile icon={AlertCircle} label="Past Due" value={stats.pending} color="amber" />
            <StatTile icon={BookOpen} label="Subjects" value={stats.graded} color="cyan" />
          </>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : isStudent ? (
        <div className="space-y-6">
          <AssignmentGroup title="Due Soon" subtitle="Within 7 days" items={studentGroups.dueSoon} variant="amber" onSubmit={(a) => setSubmitFor(a)} />
          <AssignmentGroup title="Upcoming" subtitle="More than 7 days away" items={studentGroups.upcoming} variant="emerald" onSubmit={(a) => setSubmitFor(a)} />
          <AssignmentGroup title="Past Due" subtitle="Overdue — submit ASAP" items={studentGroups.overdue} variant="red" onSubmit={(a) => setSubmitFor(a)} />
          <AssignmentGroup title="Submitted / Graded" subtitle="Completed" items={studentGroups.submitted} variant="emerald" onSubmit={(a) => setSubmitFor(a)} />
          {assignments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <ClipboardList className="h-10 w-10 opacity-40" />
                <p className="text-sm">No assignments posted for you yet.</p>
                <p className="text-xs">Check back soon — teachers are constantly adding new work.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : teacherAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <ClipboardList className="h-10 w-10 opacity-40" />
            <p className="text-sm">You haven&apos;t created any assignments yet.</p>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create your first assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teacherAssignments.map((a) => (
            <TeacherAssignmentCard
              key={a.id}
              assignment={a}
              expanded={expandedId === a.id}
              onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAssignmentDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}
      {submitFor && (
        <SubmitDialog assignment={submitFor} onClose={() => setSubmitFor(null)} onSubmitted={() => { setSubmitFor(null); load() }} />
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors[color])}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AssignmentGroup({ title, subtitle, items, variant, onSubmit }: {
  title: string
  subtitle: string
  items: Assignment[]
  variant: GroupVariant
  onSubmit: (a: Assignment) => void
}) {
  if (items.length === 0) return null
  const dotColor = variant === 'red' ? 'bg-red-500' : variant === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">· {subtitle}</span>
        <Badge variant="secondary" className="ml-1 text-xs">{items.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <StudentAssignmentCard key={a.id} assignment={a} variant={variant} onSubmit={() => onSubmit(a)} />
        ))}
      </div>
    </div>
  )
}

function StudentAssignmentCard({ assignment, variant, onSubmit }: {
  assignment: Assignment
  variant: GroupVariant
  onSubmit: () => void
}) {
  const due = new Date(assignment.dueDate)
  const status = assignment.submissionStatus
  const isGraded = status === 'Graded'
  const isSubmitted = status === 'Submitted'
  const borderClass =
    variant === 'red' ? 'border-l-red-500'
    : variant === 'amber' ? 'border-l-amber-500'
    : 'border-l-emerald-500'

  return (
    <Card className={cn('border-l-4', borderClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{assignment.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">By {assignment.teacherName}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <Badge variant="outline" className="text-[10px]">{assignment.subject}</Badge>
            <Badge variant="outline" className="text-[10px]">{assignment.className}</Badge>
          </div>
        </div>
        {assignment.description && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{assignment.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          {isGraded ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Award className="mr-1 h-3 w-3" /> Graded: {assignment.submissionGrade ?? '-'}/100
            </Badge>
          ) : isSubmitted ? (
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted — awaiting grade
            </Badge>
          ) : variant === 'red' ? (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="mr-1 h-3 w-3" /> Overdue
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="mr-1 h-3 w-3" /> Not submitted
            </Badge>
          )}
          {!isGraded && !isSubmitted && (
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={onSubmit}>
              <FileText className="h-4 w-4" /> Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TeacherAssignmentCard({ assignment, expanded, onToggle }: {
  assignment: Assignment
  expanded: boolean
  onToggle: () => void
}) {
  const due = new Date(assignment.dueDate)
  const isOverdue = due.getTime() < Date.now()
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{assignment.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Created {timeAgo(assignment.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <Badge variant="outline" className="text-[10px]">{assignment.subject}</Badge>
            <Badge variant="outline" className="text-[10px]">{assignment.className}</Badge>
          </div>
        </div>
        {assignment.description && (
          <p className={cn('mt-2 text-sm text-muted-foreground', !expanded && 'line-clamp-2')}>{assignment.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span className={cn(isOverdue && 'font-medium text-red-600 dark:text-red-400')}>
            Due {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {isOverdue && ' (overdue)'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onToggle}>
            <ClipboardCheck className="h-4 w-4" /> {expanded ? 'Hide details' : 'View details'}
          </Button>
          <div className="flex gap-1 opacity-50" title="Editing & deletion coming soon">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              Per-student submission tracking (a list of who has turned in work, plus inline
              grading forms) will appear here once submissions arrive. In the meantime, grade
              individual submissions through the{' '}
              <span className="font-medium text-emerald-600">Grades</span> view.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]"><Clock className="mr-1 h-3 w-3" /> {timeAgo(assignment.createdAt)}</Badge>
              <Badge variant="secondary" className="text-[10px]"><GraduationCap className="mr-1 h-3 w-3" /> Class {assignment.className}</Badge>
              <Badge variant="secondary" className="text-[10px]"><BookOpen className="mr-1 h-3 w-3" /> {assignment.subject}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CreateAssignmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    className: '7A',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  })

  async function save() {
    if (!form.title || !form.subject) {
      addToast({ type: 'warning', title: 'Title and subject required' })
      return
    }
    setSaving(true)
    try {
      await api('/api/assignments', { method: 'POST', body: form })
      addToast({ type: 'success', title: 'Assignment created', body: `Students in ${form.className} were notified.` })
      onCreated()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Create failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Algebra Worksheet 3" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</Label>
              <Select value={form.className} onValueChange={(v) => setForm({ ...form, className: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description / Instructions</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should students do? Page numbers, deliverables, etc." rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SubmitDialog({ assignment, onClose, onSubmitted }: { assignment: Assignment; onClose: () => void; onSubmitted: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!content.trim()) {
      addToast({ type: 'warning', title: 'Submission cannot be empty' })
      return
    }
    setSaving(true)
    try {
      await api('/api/submissions', { method: 'POST', body: { assignmentId: assignment.id, content: content.trim() } })
      addToast({ type: 'success', title: 'Submitted!', body: 'Your work has been turned in.' })
      onSubmitted()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Submit failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit: {assignment.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">Subject:</span> <span className="font-medium">{assignment.subject}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-muted-foreground">Due:</span> <span className="font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Submission</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your answer, paste your work, or write a note to your teacher..."
              rows={8}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            You can re-submit anytime before grading — your latest submission will be the one your teacher sees.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !content.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Turn In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
