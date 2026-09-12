'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DoorOpen, Plus, Loader2, X, Send, MapPin, Users, CalendarClock, Building2,
  Check, Calendar, Clock, CheckCircle2, Inbox, ArrowRight, Pencil, LayoutGrid,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Facility as BaseFacility, Booking } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Extend the base Facility type with the bookingCount field returned by the API
// (the shared types.ts interface omits it to stay lean).
type Facility = BaseFacility & { bookingCount?: number }

const FACILITY_TYPES = ['Room', 'Lab', 'Hall', 'Field', 'Equipment']

const TYPE_STYLES: Record<string, { badge: string; bar: string; icon: any }> = {
  Room:       { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', bar: 'bg-emerald-500', icon: DoorOpen },
  Lab:        { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',             bar: 'bg-teal-500',    icon: Building2 },
  Hall:       { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',         bar: 'bg-amber-500',   icon: Users },
  Field:      { badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',             bar: 'bg-cyan-500',    icon: LayoutGrid },
  Equipment:  { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',     bar: 'bg-violet-500',  icon: CalendarClock },
}

function styleFor(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.Room
}

const STAFF_CAN_MANAGE = ['Admin', 'Principal', 'Teacher']

export function FacilitiesView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingFacilityId, setBookingFacilityId] = useState<string | null>(null)
  const [addingFacility, setAddingFacility] = useState(false)
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [fRes, bRes] = await Promise.all([
          api<{ facilities: Facility[] }>('/api/facilities'),
          api<{ bookings: Booking[] }>('/api/bookings'),
        ])
        if (!active) return
        setFacilities(fRes.facilities)
        setBookings(bRes.bookings)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load facilities', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => ({
    total: facilities.length,
    bookable: facilities.filter((f) => f.isBookable).length,
    approved: bookings.filter((b) => b.status === 'Approved').length,
    pending: bookings.filter((b) => b.status === 'Pending').length,
  }), [facilities, bookings])

  // Show most-recently-booked first (descending date).
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [bookings])

  async function refreshBookings() {
    try {
      const res = await api<{ bookings: Booking[] }>('/api/bookings')
      setBookings(res.bookings)
    } catch { /* ignore */ }
  }

  async function refreshFacilities() {
    try {
      const res = await api<{ facilities: Facility[] }>('/api/facilities')
      setFacilities(res.facilities)
    } catch { /* ignore */ }
  }

  function openBooking(facility?: Facility) {
    setBookingFacilityId(facility?.id ?? null)
    setBookingOpen(true)
  }

  async function reviewBooking(id: string, status: 'Approved' | 'Rejected') {
    setReviewingId(id)
    try {
      await api(`/api/bookings/${id}`, { method: 'PATCH', body: { status } })
      addToast({
        type: status === 'Approved' ? 'success' : 'info',
        title: `Booking ${status.toLowerCase()}`,
        body: status === 'Approved' ? 'The reservation has been confirmed.' : 'The request was rejected.',
      })
      await refreshBookings()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Action failed', body: e.message })
    } finally {
      setReviewingId(null)
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
              <DoorOpen className="h-7 w-7" /> Facilities Booking
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Reserve rooms, labs, and school facilities.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              onClick={() => openBooking()}
              variant="secondary"
              className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Calendar className="h-4 w-4" /> Book Facility
            </Button>
            {canManage && (
              <Button
                onClick={() => setAddingFacility(true)}
                variant="secondary"
                className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                <Plus className="h-4 w-4" /> Add Facility
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Total Facilities" value={String(stats.total)} sub="in catalogue" color="emerald" />
        <StatCard icon={CheckCircle2} label="Bookable" value={String(stats.bookable)} sub="open for reservations" color="teal" />
        <StatCard icon={CalendarClock} label="Active Bookings" value={String(stats.approved)} sub="approved" color="cyan" />
        <StatCard icon={Inbox} label="Pending Requests" value={String(stats.pending)} sub="awaiting review" color={stats.pending > 0 ? 'amber' : 'slate'} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: facilities grid */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-4 w-4" /> Facilities
              </h3>
              <span className="text-xs text-muted-foreground">{facilities.length} total</span>
            </div>
            {facilities.length === 0 ? (
              <Card>
                <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
                  <Building2 className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No facilities configured yet.</p>
                  {canManage && (
                    <Button size="sm" className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setAddingFacility(true)}>
                      <Plus className="h-4 w-4" /> Add Facility
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {facilities.map((f) => {
                  const s = styleFor(f.type)
                  const Icon = s.icon
                  const bookingCount = f.bookingCount ?? 0
                  return (
                    <Card key={f.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className={cn('h-1.5 w-full', s.bar)} />
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.badge)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold leading-snug">{f.name}</h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">{f.type}</p>
                            </div>
                          </div>
                          <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
                            {f.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {f.capacity}</span>
                          {f.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {f.location}</span>}
                          <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {bookingCount} booking{bookingCount === 1 ? '' : 's'}</span>
                        </div>
                        {f.notes && (
                          <p className="line-clamp-2 text-[11px] text-muted-foreground">{f.notes}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold',
                            f.isBookable
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', f.isBookable ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {f.isBookable ? 'Bookable' : 'Closed'}
                          </span>
                          <div className="flex items-center gap-1">
                            {canManage && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingFacility(f)} title="Edit facility">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => openBooking(f)}
                              disabled={!f.isBookable}
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <Calendar className="h-3.5 w-3.5" /> Book
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: bookings list */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-emerald-600" /> Bookings
                </CardTitle>
                <CardDescription>
                  {bookings.length} {bookings.length === 1 ? 'reservation' : 'reservations'} total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedBookings.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <CalendarClock className="h-8 w-8 opacity-40" />
                    <p className="text-xs">No bookings yet.</p>
                    <Button size="sm" variant="outline" className="mt-1" onClick={() => openBooking()}>
                      <Plus className="h-3.5 w-3.5" /> New Booking
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {sortedBookings.map((b) => {
                      const s = styleFor(b.facilityType)
                      return (
                        <div key={b.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{b.title}</p>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold uppercase', s.badge)}>{b.facilityType}</span>
                                <span className="truncate">{b.facilityName}</span>
                              </p>
                            </div>
                            <BookingStatusBadge status={b.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.startTime}–{b.endTime}</span>
                          </div>
                          {b.purpose && (
                            <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{b.purpose}</p>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {b.requestedByName ? `by ${b.requestedByName}` : '—'} · {timeAgo(b.createdAt)}
                            </span>
                            {canManage && b.status === 'Pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  disabled={reviewingId === b.id}
                                  onClick={() => reviewBooking(b.id, 'Approved')}
                                  title="Approve booking"
                                >
                                  {reviewingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  disabled={reviewingId === b.id}
                                  onClick={() => reviewBooking(b.id, 'Rejected')}
                                  title="Reject booking"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            {b.reviewedByName && b.status !== 'Pending' && (
                              <span className="text-[10px] text-muted-foreground">by {b.reviewedByName}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {bookingOpen && (
        <BookingDialog
          facilities={facilities.filter((f) => f.isBookable)}
          initialFacilityId={bookingFacilityId}
          onClose={() => setBookingOpen(false)}
          onSaved={() => { setBookingOpen(false); refreshBookings() }}
        />
      )}
      {(addingFacility || editingFacility) && (
        <FacilityDialog
          facility={editingFacility}
          onClose={() => { setAddingFacility(false); setEditingFacility(null) }}
          onSaved={() => { setAddingFacility(false); setEditingFacility(null); refreshFacilities() }}
        />
      )}
    </div>
  )
}

function BookingStatusBadge({ status }: { status: string }) {
  if (status === 'Approved') {
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Approved</Badge>
  }
  if (status === 'Rejected') {
    return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Rejected</Badge>
  }
  return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">Pending</Badge>
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal:    'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    slate:   'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

function BookingDialog({
  facilities,
  initialFacilityId,
  onClose,
  onSaved,
}: {
  facilities: Facility[]
  initialFacilityId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [facilityId, setFacilityId] = useState(initialFacilityId ?? facilities[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  async function save() {
    if (!facilityId) {
      addToast({ type: 'warning', title: 'Select a facility', body: 'Please choose a facility to book.' })
      return
    }
    if (!title.trim()) {
      addToast({ type: 'warning', title: 'Missing title', body: 'Please give your booking a title.' })
      return
    }
    if (startTime >= endTime) {
      addToast({ type: 'warning', title: 'Invalid time', body: 'End time must be after start time.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/bookings', {
        method: 'POST',
        body: {
          facilityId,
          title: title.trim(),
          purpose: purpose.trim(),
          date,
          startTime,
          endTime,
        },
      })
      addToast({
        type: 'success',
        title: 'Booking submitted',
        body: 'Your reservation request has been sent for review.',
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
            <Calendar className="h-4 w-4 text-emerald-600" /> Book a Facility
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Facility *</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger><SelectValue placeholder="Select a facility" /></SelectTrigger>
              <SelectContent>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name} · {f.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {facilities.length === 0 && (
              <p className="text-xs text-muted-foreground">No bookable facilities available right now.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology practical session" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purpose</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Brief description of the activity..." rows={3} />
          </div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FacilityDialog({
  facility,
  onClose,
  onSaved,
}: {
  facility: Facility | null
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(facility?.name ?? '')
  const [type, setType] = useState(facility?.type ?? 'Room')
  const [capacity, setCapacity] = useState(String(facility?.capacity ?? 30))
  const [location, setLocation] = useState(facility?.location ?? '')
  const [isBookable, setIsBookable] = useState(facility?.isBookable ?? true)
  const [notes, setNotes] = useState(facility?.notes ?? '')

  async function save() {
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Missing name', body: 'Please enter a facility name.' })
      return
    }
    const cap = Number(capacity)
    if (!Number.isFinite(cap) || cap < 1) {
      addToast({ type: 'warning', title: 'Invalid capacity', body: 'Capacity must be at least 1.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        type,
        capacity: cap,
        location: location.trim() || null,
        isBookable,
        notes: notes.trim() || null,
      }
      if (facility) {
        await api(`/api/facilities/${facility.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Facility updated', body: `${name.trim()} updated.` })
      } else {
        await api('/api/facilities', { method: 'POST', body })
        addToast({ type: 'success', title: 'Facility added', body: `${name.trim()} added to the catalogue.` })
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> {facility ? 'Edit Facility' : 'Add Facility'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Science Lab 1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacity</Label>
              <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Block A, 2nd Floor" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium">Bookable</Label>
              <p className="text-xs text-muted-foreground">Allow staff to submit reservation requests</p>
            </div>
            <Switch checked={isBookable} onCheckedChange={setIsBookable} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special rules, equipment included, etc." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {facility ? 'Save Changes' : 'Add Facility'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
