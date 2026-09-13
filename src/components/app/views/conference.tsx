'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock, Plus, Loader2, X, Send, Trash2, Clock, Users,
  Calendar, CalendarDays, Check, CalendarCheck, Eye, Hourglass,
  CalendarPlus, UserCheck, CalendarRange, CheckCircle2, Ban, Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { ConferenceSlot, ConferenceBooking, Staff } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const STAFF_ROLES = ['Admin', 'Principal', 'Teacher']

function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function fmtDateShort(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function fmtTime(t: string) {
  if (!t) return '—'
  // Expecting "HH:mm" or "HH:mm:ss"
  const parts = t.split(':')
  if (parts.length < 2) return t
  let h = Number(parts[0])
  const m = parts[1]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

function statusBadge(status: string | null) {
  if (!status || status === 'Available') {
    return <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">Available</Badge>
  }
  if (status === 'Booked' || status === 'Confirmed') {
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Booked</Badge>
  }
  if (status === 'Completed') {
    return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">Completed</Badge>
  }
  if (status === 'Cancelled') {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Cancelled</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

export function ConferenceView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const isStaff = STAFF_ROLES.includes(user.role)
  const isTeacher = user.role === 'Teacher'
  const isStudent = user.role === 'Student'

  const [slots, setSlots] = useState<ConferenceSlot[]>([])
  const [bookings, setBookings] = useState<ConferenceBooking[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  const [creating, setCreating] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<ConferenceSlot | null>(null)
  const [viewingBooking, setViewingBooking] = useState<ConferenceBooking | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [sRes, bRes] = await Promise.all([
          api<{ slots: ConferenceSlot[] }>('/api/conference-slots'),
          api<{ bookings: ConferenceBooking[] }>('/api/conference-bookings'),
        ])
        if (!active) return
        setSlots(sRes.slots)
        setBookings(bRes.bookings)
        if (isStaff) {
          try {
            const stRes = await api<{ staff: Staff[] }>('/api/staff')
            if (!active) return
            setStaff(stRes.staff.filter((s) => s.role === 'Teacher' || s.role === 'Principal' || s.role === 'Vice Principal'))
          } catch { /* ignore */ }
        }
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load conferences', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, isStaff])

  const stats = useMemo(() => {
    const total = slots.length
    const booked = slots.filter((s) => s.isBooked).length
    const available = total - booked
    const mySlots = isTeacher ? slots.filter((s) => s.teacherId === user.id).length : total
    return { total, available, booked, mySlots }
  }, [slots, isTeacher, user.id])

  // For teachers: my bookings (booked slots assigned to me)
  const myTeacherBookings = useMemo(() => {
    if (!isTeacher) return []
    return bookings.filter((b) => slots.some((s) => s.id === b.slotId && s.teacherId === user.id))
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
  }, [bookings, slots, isTeacher, user.id])

  // For students: their own bookings (backend already filters)
  const myStudentBookings = useMemo(() => {
    return [...bookings].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
  }, [bookings])

  // Group available slots by teacher (for student booking view)
  const slotsByTeacher = useMemo(() => {
    const map = new Map<string, ConferenceSlot[]>()
    for (const s of slots) {
      if (s.isBooked) continue
      const arr = map.get(s.teacherName) ?? []
      arr.push(s)
      map.set(s.teacherName, arr)
    }
    // sort each group by date+time
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [slots])

  // Next upcoming conference day (slot with date >= today)
  const nextConferenceDay = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = slots
      .filter((s) => s.date >= today)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    if (upcoming.length === 0) return null
    const next = upcoming[0]
    const onSameDay = slots.filter((s) => s.date === next.date)
    return {
      date: next.date,
      total: onSameDay.length,
      available: onSameDay.filter((s) => !s.isBooked).length,
      booked: onSameDay.filter((s) => s.isBooked).length,
    }
  }, [slots])

  async function refresh() {
    try {
      const [sRes, bRes] = await Promise.all([
        api<{ slots: ConferenceSlot[] }>('/api/conference-slots'),
        api<{ bookings: ConferenceBooking[] }>('/api/conference-bookings'),
      ])
      setSlots(sRes.slots)
      setBookings(bRes.bookings)
    } catch { /* ignore */ }
  }

  async function deleteSlot(slot: ConferenceSlot) {
    if (!confirm(`Delete this slot on ${fmtDateShort(slot.date)} (${fmtTime(slot.startTime)}–${fmtTime(slot.endTime)})?`)) return
    setDeletingSlotId(slot.id)
    try {
      await api(`/api/conference-slots/${slot.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Slot deleted' })
      await refresh()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeletingSlotId(null)
    }
  }

  async function cancelBooking(b: ConferenceBooking) {
    if (!confirm('Cancel this conference booking?')) return
    setCancellingId(b.id)
    try {
      await api('/api/conference-bookings', { method: 'PATCH', body: { id: b.id, status: 'Cancelled' } })
      addToast({ type: 'success', title: 'Booking cancelled' })
      await refresh()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Cancel failed', body: e.message })
    } finally {
      setCancellingId(null)
    }
  }

  // Sorted slots table (staff view): upcoming first
  const sortedSlots = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return [...slots].sort((a, b) => {
      // upcoming (date >= today) first, then past
      const aUp = a.date >= today ? 0 : 1
      const bUp = b.date >= today ? 0 : 1
      if (aUp !== bUp) return aUp - bUp
      return (a.date + a.startTime).localeCompare(b.date + b.startTime)
    })
  }, [slots])

  return (
    <div className="space-y-6">
      {/* Header — emerald gradient banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <CalendarClock className="h-7 w-7" /> Parent-Teacher Conferences
            </h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              Schedule and book conference time slots.
            </p>
          </div>
          {isStaff && (
            <Button
              onClick={() => setCreating(true)}
              variant="secondary"
              className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> Create Slots
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Conference day summary (both roles) */}
          {nextConferenceDay && (
            <Card className="relative overflow-hidden border-brand/25 bg-gradient-to-br from-brand/10 via-brand/10 to-brand/10 dark:border-brand/40 dark:from-brand/10 dark:via-brand/10 dark:to-brand/10">
              <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md shadow-brand/20">
                    <CalendarRange className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-strong dark:text-brand">Next Conference Day</p>
                    <p className="mt-0.5 font-serif text-lg font-bold text-brand-strong dark:text-brand-foreground">{fmtDate(nextConferenceDay.date)}</p>
                    <p className="text-xs text-brand-strong/80 dark:text-brand/70">
                      {nextConferenceDay.total} {nextConferenceDay.total === 1 ? 'slot' : 'slots'} · {nextConferenceDay.available} open · {nextConferenceDay.booked} booked
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="rounded-lg bg-white/70 px-3 py-2 text-center dark:bg-white/10">
                    <p className="text-lg font-bold text-brand-strong dark:text-brand">{nextConferenceDay.available}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 text-center dark:bg-white/10">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-300">{nextConferenceDay.booked}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Booked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat cards (staff) */}
          {isStaff && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Calendar} label="Total Slots" value={String(stats.total)} sub="all sessions" color="emerald" />
              <StatCard icon={CheckCircle2} label="Available" value={String(stats.available)} sub="open for booking" color="teal" />
              <StatCard icon={Users} label="Booked" value={String(stats.booked)} sub="scheduled" color="amber" />
              <StatCard icon={isTeacher ? UserCheck : CalendarPlus} label={isTeacher ? "My Slots" : "Created"} value={String(stats.mySlots)} sub={isTeacher ? "as host teacher" : "all slots"} color="cyan" />
            </div>
          )}

          {isStaff ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Slots table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-brand" /> Conference Slots
                  </CardTitle>
                  <CardDescription>
                    {slots.length} {slots.length === 1 ? 'slot' : 'slots'} scheduled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {sortedSlots.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                      <CalendarClock className="h-10 w-10 opacity-40" />
                      <p className="text-sm">No conference slots created yet.</p>
                      <Button size="sm" onClick={() => setCreating(true)} className="bg-brand text-brand-foreground hover:bg-brand-strong">
                        <Plus className="h-4 w-4" /> Create the first slot
                      </Button>
                    </div>
                  ) : (
                    <div className="max-h-[32rem] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur">
                          <tr>
                            <th className="p-3 text-left font-medium">Date</th>
                            <th className="p-3 text-left font-medium">Time</th>
                            <th className="hidden p-3 text-left font-medium sm:table-cell">Teacher</th>
                            <th className="p-3 text-left font-medium">Status</th>
                            <th className="p-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSlots.map((s) => {
                            const linkedBooking = s.isBooked
                              ? bookings.find((b) => b.slotId === s.id && b.status !== 'Cancelled')
                              : undefined
                            return (
                              <tr key={s.id} className="border-b border-border transition hover:bg-muted/40">
                                <td className="p-3">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <CalendarDays className="h-3.5 w-3.5 text-brand" />
                                    {fmtDateShort(s.date)}
                                  </span>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                                  </span>
                                </td>
                                <td className="hidden p-3 sm:table-cell">
                                  <span className="truncate text-foreground/80">{s.teacherName}</span>
                                </td>
                                <td className="p-3">
                                  {s.isBooked ? (
                                    <div className="flex flex-col gap-0.5">
                                      <Badge className="w-fit bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Booked</Badge>
                                      {s.bookingStudentName && (
                                        <span className="text-[11px] text-muted-foreground">
                                          {s.bookingStudentName}{s.bookingParentName ? ` · ${s.bookingParentName}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">Available</Badge>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex justify-end gap-1">
                                    {linkedBooking ? (
                                      <Button size="sm" variant="ghost" onClick={() => setViewingBooking(linkedBooking)}>
                                        <Eye className="h-4 w-4" /> <span className="sr-only">View booking</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteSlot(s)}
                                        disabled={deletingSlotId === s.id}
                                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                      >
                                        {deletingSlotId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    )}
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

              {/* My Bookings (teacher) / All bookings (admin/principal) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                    {isTeacher ? 'My Bookings' : 'Recent Bookings'}
                  </CardTitle>
                  <CardDescription>
                    {isTeacher ? 'Parents booked into your slots.' : 'All parent bookings across slots.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const list = isTeacher
                      ? myTeacherBookings
                      : [...bookings].filter((b) => b.status !== 'Cancelled').sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
                    if (list.length === 0) {
                      return (
                        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                          <Users className="h-8 w-8 opacity-40" />
                          <p className="text-xs">No bookings yet.</p>
                        </div>
                      )
                    }
                    return (
                      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {list.map((b) => (
                          <div key={b.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{b.parentName}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  for {b.studentName}
                                </p>
                              </div>
                              {statusBadge(b.status)}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {fmtDateShort(b.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                              </span>
                              {!isTeacher && (
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  <UserCheck className="h-3 w-3" /> {b.teacherName}
                                </span>
                              )}
                            </div>
                            {b.notes && (
                              <p className="mt-2 line-clamp-2 rounded bg-muted/60 px-2 py-1 text-[11px] italic text-muted-foreground">
                                “{b.notes}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* STUDENT VIEW */
            isStudent ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Available slots grouped by teacher */}
                <div className="space-y-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarClock className="h-4 w-4 text-brand" /> Available Slots
                      </CardTitle>
                      <CardDescription>
                        Book a conference with your teachers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {slotsByTeacher.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                          <CalendarClock className="h-10 w-10 opacity-40" />
                          <p className="text-sm">No available conference slots right now.</p>
                          <p className="text-xs">Please check back later or contact your teacher.</p>
                        </div>
                      ) : (
                        slotsByTeacher.map(([teacherName, tSlots]) => (
                          <div key={teacherName}>
                            <div className="mb-2 flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-brand" />
                              <h4 className="text-sm font-semibold">{teacherName}</h4>
                              <Badge variant="secondary" className="bg-brand/5 text-brand-strong dark:bg-brand/12 dark:text-brand">
                                {tSlots.length} open
                              </Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {tSlots.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex flex-col rounded-lg border border-border bg-card p-3 transition hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1.5 text-sm font-medium">
                                      <CalendarDays className="h-3.5 w-3.5 text-brand" />
                                      {fmtDateShort(s.date)}
                                    </span>
                                    <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">Open</Badge>
                                  </div>
                                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" /> {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                                  </p>
                                  <Button
                                    size="sm"
                                    className="mt-3 bg-brand text-brand-foreground hover:bg-brand-strong"
                                    onClick={() => setBookingSlot(s)}
                                  >
                                    <CalendarPlus className="h-3.5 w-3.5" /> Book Slot
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* My Bookings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle2 className="h-4 w-4 text-brand" /> My Bookings
                    </CardTitle>
                    <CardDescription>
                      {myStudentBookings.length} {myStudentBookings.length === 1 ? 'booking' : 'bookings'} on record.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {myStudentBookings.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                        <CalendarCheck className="h-8 w-8 opacity-40" />
                        <p className="text-xs">You haven't booked any conferences yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                        {myStudentBookings.map((b) => (
                          <div key={b.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{b.teacherName}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  for {b.studentName}
                                </p>
                              </div>
                              {statusBadge(b.status)}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" /> {fmtDateShort(b.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                              </span>
                            </div>
                            {b.notes && (
                              <p className="mt-2 line-clamp-2 rounded bg-muted/60 px-2 py-1 text-[11px] italic text-muted-foreground">
                                “{b.notes}”
                              </p>
                            )}
                            {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 h-7 w-full text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                disabled={cancellingId === b.id}
                                onClick={() => cancelBooking(b)}
                              >
                                {cancellingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Info className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Conference scheduling is available to staff and students.</p>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}

      {creating && (
        <CreateSlotsDialog
          staff={staff}
          isTeacher={isTeacher}
          currentUserId={user.id}
          currentUserName={user.name}
          onClose={() => setCreating(false)}
          onSaved={async () => { setCreating(false); await refresh() }}
        />
      )}
      {bookingSlot && (
        <BookSlotDialog
          slot={bookingSlot}
          defaultStudentName={user.name}
          onClose={() => setBookingSlot(null)}
          onSaved={async () => { setBookingSlot(null); await refresh() }}
        />
      )}
      {viewingBooking && (
        <ViewBookingDialog
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <Hourglass className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="mt-3 text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-medium text-brand">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Create Slots Dialog (staff only)
// ---------------------------------------------------------------------------
function CreateSlotsDialog({
  staff, isTeacher, currentUserId, currentUserName, onClose, onSaved,
}: {
  staff: Staff[]
  isTeacher: boolean
  currentUserId: string
  currentUserName: string
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('16:00')
  const [teacherId, setTeacherId] = useState<string>(isTeacher ? currentUserId : '')
  const [splitIntoSlots, setSplitIntoSlots] = useState(true)

  const teacherOptions = isTeacher
    ? [{ id: currentUserId, name: currentUserName }]
    : staff

  function generateSlots(dateStr: string, start: string, end: string): { date: string; startTime: string; endTime: string }[] {
    const out: { date: string; startTime: string; endTime: string }[] = []
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let cur = sh * 60 + sm
    const fin = eh * 60 + em
    const DURATION = 15
    while (cur + DURATION <= fin) {
      const ns = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
      cur += DURATION
      const ne = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
      out.push({ date: dateStr, startTime: ns, endTime: ne })
    }
    return out
  }

  async function save() {
    if (!date) {
      addToast({ type: 'warning', title: 'Missing date', body: 'Please pick a date.' })
      return
    }
    if (!startTime || !endTime) {
      addToast({ type: 'warning', title: 'Missing time', body: 'Please set start and end times.' })
      return
    }
    if (startTime >= endTime) {
      addToast({ type: 'warning', title: 'Invalid time range', body: 'Start time must be before end time.' })
      return
    }
    if (!teacherId) {
      addToast({ type: 'warning', title: 'Missing teacher', body: 'Please select a teacher.' })
      return
    }
    setSaving(true)
    try {
      const slots = splitIntoSlots
        ? generateSlots(date, startTime, endTime)
        : [{ date, startTime, endTime }]
      if (slots.length === 0) {
        addToast({ type: 'warning', title: 'No slots', body: 'The selected range is too short.' })
        setSaving(false)
        return
      }
      // Create slots sequentially (avoid race conditions on backend).
      for (const s of slots) {
        await api('/api/conference-slots', {
          method: 'POST',
          body: { teacherId, date: s.date, startTime: s.startTime, endTime: s.endTime },
        })
      }
      addToast({
        type: 'success',
        title: 'Slots created',
        body: splitIntoSlots
          ? `${slots.length} 15-minute slots created.`
          : 'Conference slot created.',
      })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Create failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  const previewSlots = splitIntoSlots ? generateSlots(date, startTime, endTime) : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-brand" /> Create Conference Slots
          </DialogTitle>
          <DialogDescription>
            Open up time for parents to book a conference.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isTeacher && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher *</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select teacher…" /></SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Time *</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40">
            <Checkbox
              checked={splitIntoSlots}
              onCheckedChange={(v) => setSplitIntoSlots(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Split into 15-minute slots</p>
              <p className="text-xs text-muted-foreground">
                Generates multiple back-to-back 15-minute conference slots within the time range.
              </p>
            </div>
          </label>
          {splitIntoSlots && previewSlots.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" /> Preview — {previewSlots.length} slots will be created
              </p>
              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {previewSlots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-background px-2 py-1 text-[11px]">
                    <span>{fmtDateShort(s.date)}</span>
                    <span className="font-mono text-muted-foreground">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Create Slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Book Slot Dialog (student)
// ---------------------------------------------------------------------------
function BookSlotDialog({
  slot, defaultStudentName, onClose, onSaved,
}: {
  slot: ConferenceSlot
  defaultStudentName: string
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [studentName, setStudentName] = useState(defaultStudentName)
  const [notes, setNotes] = useState('')

  async function save() {
    if (!studentName.trim()) {
      addToast({ type: 'warning', title: 'Missing name', body: 'Please enter the student name.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/conference-bookings', {
        method: 'POST',
        body: {
          slotId: slot.id,
          studentName: studentName.trim(),
          notes: notes.trim() || null,
        },
      })
      addToast({
        type: 'success',
        title: 'Slot booked',
        body: `Conference with ${slot.teacherName} on ${fmtDateShort(slot.date)}.`,
      })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Booking failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand" /> Book Conference
          </DialogTitle>
          <DialogDescription>
            Confirm your booking for the selected time slot.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Slot summary */}
          <div className="rounded-lg border border-brand/25 bg-brand/5 p-3 dark:border-brand/40 dark:bg-brand/10">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="h-4 w-4 text-brand" /> {slot.teacherName}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-brand" /> {fmtDate(slot.date)}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4 text-brand" /> {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student Name *</Label>
            <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you'd like the teacher to know ahead of the meeting…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirm Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// View Booking Dialog (staff)
// ---------------------------------------------------------------------------
function ViewBookingDialog({
  booking, onClose,
}: {
  booking: ConferenceBooking
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand" /> Booking Details
          </DialogTitle>
          <DialogDescription>Parent-teacher conference booking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <DetailRow icon={UserCheck} label="Parent" value={booking.parentName} />
          <DetailRow icon={Users} label="Student" value={booking.studentName} />
          <DetailRow icon={UserCheck} label="Teacher" value={booking.teacherName} />
          <Separator />
          <DetailRow icon={CalendarDays} label="Date" value={fmtDate(booking.date)} />
          <DetailRow icon={Clock} label="Time" value={`${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)}`} />
          <DetailRow icon={CheckCircle2} label="Status" value={booking.status} />
          {booking.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm italic">{booking.notes}</p>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-brand" /> {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
