'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Trophy, Plus, CalendarDays, Clock, MapPin, Users, Eye, Pencil, Trash2,
  X, Loader2, Send, UserPlus, Check, Info, ArrowRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SchoolEvent, EventParticipant, Student, Staff } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const EVENT_TYPES = ['Sports', 'Science', 'Cultural', 'Charity', 'Activity'] as const

const TYPE_STYLES: Record<string, { badge: string; bar: string }> = {
  Sports: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  Science: {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    bar: 'bg-teal-500',
  },
  Cultural: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    bar: 'bg-violet-500',
  },
  Charity: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  Activity: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    bar: 'bg-cyan-500',
  },
}

const STATUS_STYLES: Record<string, string> = {
  Planned: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Ongoing: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Completed: 'bg-muted text-muted-foreground',
  Cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

const STATUSES = ['Planned', 'Ongoing', 'Completed', 'Cancelled']
const PARTICIPANT_ROLES = ['Participant', 'Organizer', 'Volunteer', 'Judge', 'Speaker']

const STAFF_CAN_MANAGE = ['Admin', 'Principal', 'Teacher']

function styleForType(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.Activity
}

function formatEventDate(date: string): string {
  try {
    const d = date.length === 10 ? new Date(date + 'T00:00:00') : new Date(date)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

function formatTime(t: string | null): string {
  if (!t) return ''
  try {
    if (/^\d{2}:\d{2}$/.test(t)) {
      const [h, m] = t.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return t
  }
}

export function ActivitiesView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SchoolEvent | null>(null)
  const [detailEvent, setDetailEvent] = useState<SchoolEvent | null>(null)

  const isStudent = user.role === 'Student'
  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ events: SchoolEvent[] }>('/api/school-events')
        if (!active) return
        setEvents(res.events)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load events', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    return {
      total: events.length,
      upcoming: events.filter((e) => e.status === 'Planned').length,
      completed: events.filter((e) => e.status === 'Completed').length,
      participants: events.reduce((a, e) => a + e.participantCount, 0),
    }
  }, [events])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return events
    return events.filter((e) => e.type === typeFilter)
  }, [events, typeFilter])

  function onEventSaved() {
    setAdding(false)
    setEditing(null)
    ;(async () => {
      try {
        const res = await api<{ events: SchoolEvent[] }>('/api/school-events')
        setEvents(res.events)
      } catch { /* ignore */ }
    })()
  }

  async function deleteEvent(ev: SchoolEvent) {
    if (!confirm(`Delete event "${ev.title}"?`)) return
    try {
      await api(`/api/school-events/${ev.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Event deleted', body: ev.title })
      setEvents((prev) => prev.filter((e) => e.id !== ev.id))
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
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
              <Trophy className="h-7 w-7" /> School Activities
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Sports, science fairs, cultural events, and more.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Trophy} label="Total Events" value={String(stats.total)} sub="all activities" color="emerald" />
        <StatCard icon={CalendarDays} label="Upcoming" value={String(stats.upcoming)} sub="planned" color="amber" />
        <StatCard icon={Check} label="Completed" value={String(stats.completed)} sub="finished" color="teal" />
        <StatCard icon={Users} label="Total Participants" value={String(stats.participants)} sub="registered" color="cyan" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', ...EVENT_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition',
              typeFilter === t
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
            <Trophy className="h-10 w-10 opacity-40" />
            <p className="text-sm">No events{typeFilter !== 'all' ? ` of type "${typeFilter}"` : ''} yet.</p>
            {canManage && <p className="text-xs text-emerald-600">Click &ldquo;Add Event&rdquo; to create one.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ev) => {
            const s = styleForType(ev.type)
            return (
              <Card key={ev.id} className="overflow-hidden transition hover:shadow-md">
                <div className={cn('h-1.5 w-full', s.bar)} />
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-semibold leading-snug">{ev.title}</h3>
                    <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
                      {ev.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatEventDate(ev.date)}
                    </span>
                    {(ev.startTime || ev.endTime) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(ev.startTime)}{ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}
                      </span>
                    )}
                  </div>
                  {ev.venue && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {ev.venue}
                    </p>
                  )}
                  {ev.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{ev.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLES[ev.status] ?? STATUS_STYLES.Planned)}>
                        {ev.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {ev.participantCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setDetailEvent(ev)}>
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Button>
                    {canManage && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(ev)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => deleteEvent(ev)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {(adding || editing) && (
        <EventDialog
          event={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={onEventSaved}
        />
      )}

      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onChanged={() => {
            ;(async () => {
              try {
                const res = await api<{ events: SchoolEvent[] }>('/api/school-events')
                setEvents(res.events)
              } catch { /* ignore */ }
            })()
          }}
        />
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition group-hover:from-emerald-500/10 group-hover:to-teal-500/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

function EventDialog({ event, onClose, onSaved }: { event: SchoolEvent | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: event?.title ?? '',
    type: event?.type ?? 'Activity',
    description: event?.description ?? '',
    date: event?.date ?? new Date().toISOString().slice(0, 10),
    startTime: event?.startTime ?? '',
    endTime: event?.endTime ?? '',
    venue: event?.venue ?? '',
    status: event?.status ?? 'Planned',
  })

  async function save() {
    if (!form.title.trim()) {
      addToast({ type: 'warning', title: 'Missing title', body: 'Please enter an event title.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim() || null,
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        venue: form.venue.trim() || null,
        status: form.status,
      }
      if (event) {
        await api(`/api/school-events/${event.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Event updated', body: form.title.trim() })
      } else {
        await api('/api/school-events', { method: 'POST', body })
        addToast({ type: 'success', title: 'Event created', body: form.title.trim() })
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> {event ? 'Edit Event' : 'Add Event'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Inter-House Athletics" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the event…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Venue</Label>
            <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="e.g. School Field" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {event ? 'Save Changes' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventDetailDialog({ event, onClose, onChanged }: { event: SchoolEvent; onClose: () => void; onChanged: () => void }) {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const isStudent = user.role === 'Student'
  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  const [participants, setParticipants] = useState<EventParticipant[]>([])
  const [loadingP, setLoadingP] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [pickerRole, setPickerRole] = useState<'student' | 'staff'>('student')
  const [pickedUserId, setPickedUserId] = useState('')
  const [pickedRole, setPickedRole] = useState('Participant')
  const [addingP, setAddingP] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoadingP(true)
      try {
        const res = await api<{ participants: EventParticipant[] }>(
          '/api/event-participants',
          { query: { eventId: event.id } }
        )
        if (!active) return
        setParticipants(res.participants)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load participants', body: e.message })
      } finally {
        if (active) setLoadingP(false)
      }
    }
    load()
    return () => { active = false }
  }, [event.id, addToast])

  // Load students + staff when the inline "Add participant" picker opens.
  useEffect(() => {
    if (!showAdd) return
    let active = true
    async function load() {
      try {
        const [sRes, stRes] = await Promise.all([
          api<{ students: Student[] }>('/api/students'),
          api<{ staff: Staff[] }>('/api/staff'),
        ])
        if (!active) return
        setStudents(sRes.students)
        setStaff(stRes.staff)
      } catch { /* ignore */ }
    }
    load()
    return () => { active = false }
  }, [showAdd])

  async function registerSelf() {
    setRegistering(true)
    try {
      await api('/api/event-participants', {
        method: 'POST',
        body: { eventId: event.id, userId: user.id, role: 'Participant' },
      })
      addToast({ type: 'success', title: 'Registered!', body: `You're now registered for "${event.title}".` })
      const res = await api<{ participants: EventParticipant[] }>(
        '/api/event-participants',
        { query: { eventId: event.id } }
      )
      setParticipants(res.participants)
      onChanged()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Registration failed', body: e.message })
    } finally {
      setRegistering(false)
    }
  }

  async function addParticipant() {
    if (!pickedUserId) {
      addToast({ type: 'warning', title: 'Select a person', body: 'Please pick a student or staff member.' })
      return
    }
    setAddingP(true)
    try {
      await api('/api/event-participants', {
        method: 'POST',
        body: { eventId: event.id, userId: pickedUserId, role: pickedRole },
      })
      addToast({ type: 'success', title: 'Participant added' })
      const res = await api<{ participants: EventParticipant[] }>(
        '/api/event-participants',
        { query: { eventId: event.id } }
      )
      setParticipants(res.participants)
      onChanged()
      setPickedUserId('')
      setShowAdd(false)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Add failed', body: e.message })
    } finally {
      setAddingP(false)
    }
  }

  async function removeParticipant(p: EventParticipant) {
    if (!confirm(`Remove ${p.userName} from this event?`)) return
    try {
      await api(`/api/event-participants/${p.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Removed', body: p.userName })
      setParticipants((prev) => prev.filter((x) => x.id !== p.id))
      onChanged()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Remove failed', body: e.message })
    }
  }

  const alreadyRegistered = participants.some((p) => p.userId === user.id)
  const s = styleForType(event.type)
  const pickerList = pickerRole === 'student' ? students : staff

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
              {event.type}
            </span>
            <span className="truncate">{event.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Event details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            {(event.startTime || event.endTime) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTime(event.startTime)}{event.endTime ? ` – ${formatTime(event.endTime)}` : ''}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.venue}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLES[event.status] ?? STATUS_STYLES.Planned)}>
                {event.status}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {participants.length} registered
              </span>
            </div>
          </div>
          {event.description && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Info className="h-3 w-3" /> Description
              </p>
              <p className="mt-1 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Participants list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Participants</h4>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </Button>
              )}
            </div>
            {loadingP ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : participants.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-1 text-muted-foreground">
                <Users className="h-8 w-8 opacity-40" />
                <p className="text-xs">No participants yet.</p>
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <UserAvatar name={p.userName} role={p.userRole} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.userName}</p>
                      <p className="text-xs text-muted-foreground">{p.userRole} · {p.role}</p>
                    </div>
                    {canManage && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => removeParticipant(p)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student self-register */}
          {isStudent && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              {alreadyRegistered ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" /> You&rsquo;re registered for this event.
                </p>
              ) : (
                <Button onClick={registerSelf} disabled={registering} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Register for this Event
                </Button>
              )}
            </div>
          )}

          {/* Staff add participant inline */}
          {canManage && showAdd && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex gap-2">
                <Button size="sm" variant={pickerRole === 'student' ? 'default' : 'outline'} onClick={() => { setPickerRole('student'); setPickedUserId('') }} className={pickerRole === 'student' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}>
                  Students
                </Button>
                <Button size="sm" variant={pickerRole === 'staff' ? 'default' : 'outline'} onClick={() => { setPickerRole('staff'); setPickedUserId('') }} className={pickerRole === 'staff' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}>
                  Staff
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={pickedUserId} onValueChange={setPickedUserId}>
                  <SelectTrigger><SelectValue placeholder={`Pick a ${pickerRole}…`} /></SelectTrigger>
                  <SelectContent>
                    {pickerList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pickedRole} onValueChange={setPickedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" onClick={addParticipant} disabled={addingP} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {addingP ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Participant
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
