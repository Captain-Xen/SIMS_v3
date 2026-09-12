'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Loader2, X, Send,
  Trash2, Clock, CalendarRange, Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { CalendarEvent } from '@/lib/types'
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

const EVENT_TYPES = ['Event', 'Exam', 'Holiday', 'Meeting'] as const

const EVENT_STYLES: Record<string, { dot: string; pill: string; text: string }> = {
  Exam: { dot: '#ef4444', pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', text: 'text-rose-700 dark:text-rose-300' },
  Event: { dot: '#10b981', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', text: 'text-emerald-700 dark:text-emerald-300' },
  Holiday: { dot: '#8b5cf6', pill: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', text: 'text-violet-700 dark:text-violet-300' },
  Meeting: { dot: '#f59e0b', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', text: 'text-amber-700 dark:text-amber-300' },
}

function styleFor(type: string) {
  return EVENT_STYLES[type] ?? EVENT_STYLES.Event
}

const STAFF_CAN_MANAGE = ['Admin', 'Principal', 'Teacher']

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function EventsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toDateStr(new Date()))
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)

  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ events: CalendarEvent[] }>('/api/events', { query: { range: 'all' } })
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

  // Calendar grid for the current month
  const cells = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const arr: { day: number | null; dateStr: string | null }[] = []
    for (let i = 0; i < startWeekday; i++) arr.push({ day: null, dateStr: null })
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ day: d, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }
    // pad trailing to fill 6 rows (42 cells) for stable layout
    while (arr.length % 7 !== 0) arr.push({ day: null, dateStr: null })
    return arr
  }, [calMonth])

  const today = new Date()
  const todayStr = toDateStr(today)
  const monthName = calMonth.toLocaleString('default', { month: 'long' })
  const year = calMonth.getFullYear()

  function eventsForDate(dateStr: string) {
    return events.filter((e) => e.date === dateStr).sort((a, b) => a.title.localeCompare(b.title))
  }

  // Upcoming events (next 5, sorted ascending, including today onward)
  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
  }, [events, todayStr])

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []

  async function deleteEvent(ev: CalendarEvent) {
    setDeleting(ev.id)
    try {
      await api('/api/events', { method: 'DELETE', body: { id: ev.id } })
      setEvents((prev) => prev.filter((x) => x.id !== ev.id))
      addToast({ type: 'success', title: 'Event deleted', body: `"${ev.title}" removed.` })
      if (detailEvent?.id === ev.id) setDetailEvent(null)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  function onEventSaved() {
    setAdding(false)
    ;(async () => {
      try {
        const res = await api<{ events: CalendarEvent[] }>('/api/events', { query: { range: 'all' } })
        setEvents(res.events)
      } catch { /* ignore */ }
    })()
  }

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <CalendarDays className="h-7 w-7" /> Events Calendar
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Stay on top of exams, holidays, meetings and school events.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 text-xs">
          <span className="font-medium text-muted-foreground">Legend:</span>
          {EVENT_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: styleFor(t).dot }} />
              <span className="font-medium">{t}</span>
            </span>
          ))}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar grid (full size) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarRange className="h-4 w-4 text-emerald-600" /> {monthName} {year}
                </CardTitle>
                <CardDescription>Click a day to see all events</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(year, calMonth.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => {
                  const now = new Date()
                  setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                  setSelectedDate(toDateStr(now))
                }}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(year, calMonth.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {d}
                  </div>
                ))}
                {/* Day cells */}
                {cells.map((c, i) => {
                  if (c.day === null || c.dateStr === null) {
                    return <div key={i} className="min-h-[84px] rounded-lg bg-muted/30 sm:min-h-[100px]" />
                  }
                  const dayEvents = eventsForDate(c.dateStr)
                  const isToday = c.dateStr === todayStr
                  const isSelected = c.dateStr === selectedDate
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDate(c.dateStr!)}
                      className={cn(
                        'min-h-[84px] rounded-lg border p-1.5 text-left align-top transition sm:min-h-[100px]',
                        isSelected
                          ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'border-border hover:border-emerald-400/60 hover:bg-muted/40',
                        isToday && !isSelected && 'border-emerald-500/60',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          isToday ? 'bg-emerald-600 text-white' : 'text-foreground',
                        )}>
                          {c.day}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((e) => {
                          const s = styleFor(e.type)
                          return (
                            <div
                              key={e.id}
                              onClick={(ev) => { ev.stopPropagation(); setDetailEvent(e) }}
                              className={cn('truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer', s.pill)}
                              title={e.title}
                            >
                              {e.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="px-1 text-[10px] font-medium text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right column */}
          <div className="space-y-6">
            {/* Selected day panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  {selectedDate ? selectedDateLabel : 'Select a day'}
                </CardTitle>
                <CardDescription>
                  {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 opacity-40" />
                    <p className="text-xs">No events on this day.</p>
                    {canManage && <p className="text-xs">Click "Add Event" to create one.</p>}
                  </div>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {selectedEvents.map((e) => {
                      const s = styleFor(e.type)
                      return (
                        <div key={e.id} className="rounded-lg border border-border p-3 transition hover:bg-muted/40">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailEvent(e)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-sm font-semibold">{e.title}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                                  {e.type}
                                </span>
                              </div>
                              {e.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>
                              )}
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase', s.pill)}>
                                {e.type}
                              </span>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 hover:text-rose-700"
                                  disabled={deleting === e.id}
                                  onClick={() => deleteEvent(e)}
                                >
                                  {deleting === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarRange className="h-4 w-4 text-emerald-600" /> Upcoming
                </CardTitle>
                <CardDescription>Next 5 events on the calendar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No upcoming events scheduled.</p>
                ) : (
                  upcoming.map((e) => {
                    const s = styleFor(e.type)
                    const d = new Date(e.date + 'T00:00:00')
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setDetailEvent(e)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/40"
                      >
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {d.toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-base font-bold leading-none">{d.getDate()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{e.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {e.description ?? e.type}
                          </p>
                        </div>
                        <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase', s.pill)}>
                          {e.type}
                        </span>
                      </button>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {adding && <AddEventDialog onClose={() => setAdding(false)} onSaved={onEventSaved} />}
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          canDelete={canManage}
          onDelete={() => deleteEvent(detailEvent)}
          deleting={deleting === detailEvent.id}
        />
      )}
    </div>
  )
}

function AddEventDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateStr(new Date()))
  const [type, setType] = useState<string>('Event')
  const [description, setDescription] = useState('')

  async function save() {
    if (!title.trim() || !date) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please enter a title and date.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/events', {
        method: 'POST',
        body: {
          title: title.trim(),
          date,
          type,
          description: description.trim() || null,
        },
      })
      addToast({ type: 'success', title: 'Event created', body: `"${title.trim()}" scheduled for ${date}.` })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Create failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> Add Event
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-term Mathematics Exam" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Optional notes about this event…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EventDetailDialog({
  event, onClose, canDelete, onDelete, deleting,
}: {
  event: CalendarEvent
  onClose: () => void
  canDelete: boolean
  onDelete: () => void
  deleting: boolean
}) {
  const s = styleFor(event.type)
  const d = new Date(event.date + 'T00:00:00')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-600" /> Event Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold leading-tight">{event.title}</h3>
            <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.pill)}>
              {event.type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          {event.description ? (
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground/90">{event.description}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground">No description provided.</p>
          )}
        </div>
        <DialogFooter>
          {canDelete && (
            <Button variant="destructive" onClick={onDelete} disabled={deleting} className="mr-auto">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
