'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bus, Plus, Users, Trash2, Pencil, Phone, Clock, MapPin, User as UserIcon,
  Loader2, X, Send, Route as RouteIcon, CalendarDays, Mail, AlertCircle,
  ArrowRight, Gauge, CheckCircle2, PhoneCall, StickyNote,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { BusRoute, BusAssignment, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const STAFF_ROLES = ['Admin', 'Principal']

export function TransportView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const isStaff = STAFF_ROLES.includes(user.role)
  const isStudent = user.role === 'Student'

  const [routes, setRoutes] = useState<BusRoute[]>([])
  const [assignments, setAssignments] = useState<BusAssignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<BusRoute | null>(null)
  const [assigningRoute, setAssigningRoute] = useState<BusRoute | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [deletingRoute, setDeletingRoute] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [rRes, aRes] = await Promise.all([
          api<{ routes: BusRoute[] }>('/api/routes'),
          api<{ assignments: BusAssignment[] }>('/api/bus-assignments'),
        ])
        if (!active) return
        setRoutes(rRes.routes)
        setAssignments(aRes.assignments)
        if (isStaff) {
          try {
            const sRes = await api<{ students: Student[] }>('/api/students')
            if (active) setStudents(sRes.students)
          } catch { /* ignore */ }
        }
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load transport data', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, isStaff])

  // Derived stats (staff)
  const stats = useMemo(() => {
    const totalCapacity = routes.reduce((a, r) => a + r.capacity, 0)
    const totalAssigned = routes.reduce((a, r) => a + r.assignedCount, 0)
    const utilization = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0
    return {
      routes: routes.length,
      assigned: totalAssigned,
      capacity: totalCapacity,
      utilization,
    }
  }, [routes])

  // Student: their own assignment + route
  const myAssignment = useMemo(
    () => (isStudent ? assignments.find((a) => a.studentId === user.id) ?? null : null),
    [assignments, isStudent, user.id]
  )
  const myRoute = useMemo(
    () => (myAssignment ? routes.find((r) => r.id === myAssignment.routeId) ?? null : null),
    [myAssignment, routes]
  )

  async function refreshRoutes() {
    try {
      const rRes = await api<{ routes: BusRoute[] }>('/api/routes')
      setRoutes(rRes.routes)
    } catch { /* ignore */ }
  }

  async function refreshAll() {
    try {
      const [rRes, aRes] = await Promise.all([
        api<{ routes: BusRoute[] }>('/api/routes'),
        api<{ assignments: BusAssignment[] }>('/api/bus-assignments'),
      ])
      setRoutes(rRes.routes)
      setAssignments(aRes.assignments)
    } catch { /* ignore */ }
  }

  async function onDeleteRoute(r: BusRoute) {
    if (!confirm(`Delete route "${r.routeName}"? Student assignments to this route will be unassigned.`)) return
    setDeletingRoute(r.id)
    try {
      await api(`/api/routes/${r.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Route deleted', body: `"${r.routeName}" was removed.` })
      await refreshAll()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeletingRoute(null)
    }
  }

  async function onRemoveAssignment(a: BusAssignment) {
    setRemoving(a.id)
    try {
      await api('/api/bus-assignments', { method: 'DELETE', body: { id: a.id } })
      addToast({ type: 'success', title: 'Assignment removed', body: `${a.studentName} is no longer on this route.` })
      await refreshAll()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Remove failed', body: e.message })
    } finally {
      setRemoving(null)
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
              <Bus className="h-7 w-7" /> Transportation
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              {isStaff
                ? 'Manage bus routes, drivers, and student assignments.'
                : 'Your bus route, driver details, and pickup / drop times.'}
            </p>
          </div>
          {isStaff && (
            <Button
              onClick={() => setAdding(true)}
              variant="secondary"
              className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> Add Route
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
      ) : isStaff ? (
        <>
          {/* Staff stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={RouteIcon} label="Total Routes" value={String(stats.routes)} sub="configured" color="emerald" />
            <StatCard icon={Users} label="Total Assignments" value={String(stats.assigned)} sub="students riding" color="teal" />
            <StatCard icon={Bus} label="Total Capacity" value={String(stats.capacity)} sub="seats available" color="cyan" />
            <StatCard icon={Gauge} label="Utilization Rate" value={`${stats.utilization}%`} sub={`${stats.assigned} / ${stats.capacity}`} color={stats.utilization > 90 ? 'amber' : 'emerald'} />
          </div>

          {/* Routes grid */}
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <RouteIcon className="h-5 w-5 text-emerald-600" /> Bus Routes
            </h3>
            <Button size="sm" onClick={() => setAdding(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Add Route
            </Button>
          </div>

          {routes.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
                <Bus className="h-10 w-10 opacity-40" />
                <p className="text-sm">No bus routes configured yet.</p>
                <Button size="sm" onClick={() => setAdding(true)} className="mt-1 bg-emerald-600 text-white hover:bg-emerald-700">
                  <Plus className="h-4 w-4" /> Create the first route
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {routes.map((r) => {
                const util = r.capacity > 0 ? Math.min(100, Math.round((r.assignedCount / r.capacity) * 100)) : 0
                const full = r.assignedCount >= r.capacity
                return (
                  <Card key={r.id} className="overflow-hidden transition hover:shadow-md">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-2 font-semibold leading-snug">
                            <Bus className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span className="truncate">{r.routeName}</span>
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" /> Driver: {r.driverName || '—'}
                          </p>
                        </div>
                        <Badge
                          variant={full ? 'destructive' : 'secondary'}
                          className={cn(
                            'shrink-0',
                            full
                              ? ''
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          )}
                        >
                          {r.assignedCount}/{r.capacity}
                        </Badge>
                      </div>

                      {/* Driver + vehicle meta */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</p>
                            <p className="font-medium">{r.driverPhone ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vehicle</p>
                            <p className="font-medium">{r.vehicleNo ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pickup</p>
                            <p className="font-medium">{r.morningPickup ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Drop-off</p>
                            <p className="font-medium">{r.eveningDrop ?? '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Utilization */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Utilization</span>
                          <span className={cn('font-semibold', full ? 'text-rose-600' : 'text-emerald-600')}>
                            {util}%
                          </span>
                        </div>
                        <Progress
                          value={util}
                          className={cn('h-2', full && '[&>div]:bg-rose-500')}
                        />
                      </div>

                      {/* Stops */}
                      {r.stops.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            <MapPin className="h-3 w-3" /> Stops ({r.stops.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {r.stops.map((s, i) => (
                              <Badge key={i} variant="outline" className="bg-emerald-50/50 text-[10px] dark:bg-emerald-950/20">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssigningRoute(r)}
                          disabled={full}
                          className="flex-1"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {full ? 'Route Full' : 'Assign Students'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteRoute(r)}
                          disabled={deletingRoute === r.id}
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        >
                          {deletingRoute === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Assignments table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-emerald-600" /> Student Assignments
              </CardTitle>
              <CardDescription>
                {assignments.length} {assignments.length === 1 ? 'student' : 'students'} currently assigned to a route
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Users className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No student assignments yet.</p>
                  <p className="text-xs">Assign students to a route from a route card above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Student</th>
                        <th className="hidden p-3 text-left font-medium sm:table-cell">Class</th>
                        <th className="p-3 text-left font-medium">Route</th>
                        <th className="hidden p-3 text-left font-medium md:table-cell">Assigned</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id} className="border-b border-border transition hover:bg-muted/40">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={a.studentName} avatar={null} role="Student" size="sm" />
                              <span className="font-medium">{a.studentName}</span>
                            </div>
                          </td>
                          <td className="hidden p-3 sm:table-cell">
                            <Badge variant="outline">{a.studentClass ?? '—'}</Badge>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-1.5">
                              <Bus className="h-3.5 w-3.5 text-emerald-600" />
                              {a.routeName}
                            </span>
                          </td>
                          <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">
                            {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onRemoveAssignment(a)}
                                disabled={removing === a.id}
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                                title="Remove assignment"
                              >
                                {removing === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* ---- Student view ---- */
        <StudentTransportCard assignment={myAssignment} route={myRoute} />
      )}

      {(adding || editing) && (
        <RouteDialog
          route={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={async () => {
            setAdding(false)
            setEditing(null)
            await refreshRoutes()
          }}
        />
      )}

      {assigningRoute && (
        <AssignStudentsDialog
          route={assigningRoute}
          students={students}
          existingAssignments={assignments}
          onClose={() => setAssigningRoute(null)}
          onSaved={async () => {
            setAssigningRoute(null)
            await refreshAll()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student transport card
// ---------------------------------------------------------------------------
function StudentTransportCard({
  assignment, route,
}: { assignment: BusAssignment | null; route: BusRoute | null }) {
  if (!assignment || !route) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
            <Bus className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-lg font-semibold">You are not currently assigned to a bus route</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Please contact the school office to be assigned to a route. They will let you know your driver, pickup time, and stop details.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <StickyNote className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-amber-800 dark:text-amber-200">
              Tip: bring your student ID when visiting the transportation office.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const util = route.capacity > 0 ? Math.min(100, Math.round((route.assignedCount / route.capacity) * 100)) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main route card */}
      <Card className="overflow-hidden lg:col-span-2">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-emerald-600" />
            {route.routeName}
          </CardTitle>
          <CardDescription>Your assigned bus route</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Driver + contact */}
          <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <UserIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Driver</p>
                <p className="font-semibold">{route.driverName || '—'}</p>
                <p className="text-xs text-muted-foreground">{route.driverPhone ?? 'No phone on file'}</p>
              </div>
            </div>
            {route.driverPhone && (
              <div className="flex gap-2">
                <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <a href={`tel:${route.driverPhone}`}>
                    <PhoneCall className="h-4 w-4" /> Call Driver
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`sms:${route.driverPhone}`}>
                    <Mail className="h-4 w-4" /> Message
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Schedule + vehicle */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile icon={Clock} label="Morning Pickup" value={route.morningPickup ?? 'Not set'} color="emerald" />
            <InfoTile icon={Clock} label="Evening Drop-off" value={route.eveningDrop ?? 'Not set'} color="teal" />
            <InfoTile icon={Bus} label="Vehicle Number" value={route.vehicleNo ?? 'Not set'} color="cyan" />
            <InfoTile icon={Users} label="Bus Capacity" value={`${route.assignedCount} / ${route.capacity} riders`} color="amber" />
          </div>

          {/* Utilization */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bus Occupancy</span>
              <span className="font-semibold text-emerald-600">{util}%</span>
            </div>
            <Progress value={util} className="h-2" />
          </div>

          {/* Stops */}
          {route.stops.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Route Stops
              </p>
              <div className="flex flex-wrap gap-1.5">
                {route.stops.map((s, i) => (
                  <Badge key={i} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {i + 1}. {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side info */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-emerald-600" /> Assignment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Assigned on">
              {new Date(assignment.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Row>
            <Separator />
            <Row label="Class">
              <Badge variant="outline">{assignment.studentClass ?? '—'}</Badge>
            </Row>
            <Separator />
            <Row label="Status">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </span>
            </Row>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/10">
          <CardContent className="space-y-2 p-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Need to change routes?</p>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
              If you move, change schools, or need a different pickup, please contact the school office. They will update your assignment for you.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

function InfoTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard (staff)
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon, label, value, sub, color,
}: { icon: any; label: string; value: string; sub: string; color: string }) {
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

// ---------------------------------------------------------------------------
// Add / Edit Route Dialog
// ---------------------------------------------------------------------------
function RouteDialog({
  route, onClose, onSaved,
}: {
  route: BusRoute | null
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [routeName, setRouteName] = useState(route?.routeName ?? '')
  const [driverName, setDriverName] = useState(route?.driverName ?? '')
  const [driverPhone, setDriverPhone] = useState(route?.driverPhone ?? '')
  const [vehicleNo, setVehicleNo] = useState(route?.vehicleNo ?? '')
  const [capacity, setCapacity] = useState(String(route?.capacity ?? 30))
  const [morningPickup, setMorningPickup] = useState(route?.morningPickup ?? '')
  const [eveningDrop, setEveningDrop] = useState(route?.eveningDrop ?? '')
  const [stopsText, setStopsText] = useState(route?.stops.join(', ') ?? '')

  async function save() {
    if (!routeName.trim()) {
      addToast({ type: 'warning', title: 'Route name required', body: 'Please enter a name for this route.' })
      return
    }
    if (!driverName.trim()) {
      addToast({ type: 'warning', title: 'Driver name required', body: 'Please enter the driver name.' })
      return
    }
    const cap = Number(capacity)
    if (!Number.isFinite(cap) || cap < 1) {
      addToast({ type: 'warning', title: 'Invalid capacity', body: 'Capacity must be at least 1.' })
      return
    }
    const stops = stopsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      const payload = {
        routeName: routeName.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim() || null,
        vehicleNo: vehicleNo.trim() || null,
        capacity: cap,
        morningPickup: morningPickup || null,
        eveningDrop: eveningDrop || null,
        stops,
      }
      if (route) {
        await api(`/api/routes/${route.id}`, { method: 'PATCH', body: payload })
        addToast({ type: 'success', title: 'Route updated', body: `"${routeName.trim()}" was saved.` })
      } else {
        await api('/api/routes', { method: 'POST', body: payload })
        addToast({ type: 'success', title: 'Route added', body: `"${routeName.trim()}" was created.` })
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-emerald-600" />
            {route ? 'Edit Bus Route' : 'Add Bus Route'}
          </DialogTitle>
          <DialogDescription>
            {route ? 'Update the route, driver, and schedule details below.' : 'Configure a new bus route with driver, capacity, and stops.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Route Name *</Label>
            <Input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. Route 1 — Downtown Loop" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driver Name *</Label>
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Mr. Brown" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driver Phone</Label>
            <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="876-555-0100" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle Number</Label>
            <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. BUS-014" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacity</Label>
            <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Morning Pickup Time</Label>
            <Input type="time" value={morningPickup} onChange={(e) => setMorningPickup(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evening Drop-off Time</Label>
            <Input type="time" value={eveningDrop} onChange={(e) => setEveningDrop(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stops <span className="text-muted-foreground/70">(comma-separated)</span>
            </Label>
            <Input
              value={stopsText}
              onChange={(e) => setStopsText(e.target.value)}
              placeholder="e.g. Cross Roads, Half Way Tree, Liguanea, School Gate"
            />
            <p className="text-[10px] text-muted-foreground">
              Separate each stop with a comma. Stops will be shown as badges on the route card.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {route ? 'Save Changes' : 'Add Route'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Assign Students Dialog
// ---------------------------------------------------------------------------
function AssignStudentsDialog({
  route, students, existingAssignments, onClose, onSaved,
}: {
  route: BusRoute
  students: Student[]
  existingAssignments: BusAssignment[]
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(
    new Set(existingAssignments.filter((a) => a.routeId === route.id).map((a) => a.studentId))
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admissionNo ?? '').toLowerCase().includes(q) ||
        (s.className ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, search])

  async function assignOne(s: Student) {
    setAssigning(s.id)
    try {
      await api('/api/bus-assignments', { method: 'POST', body: { routeId: route.id, studentId: s.id } })
      addToast({ type: 'success', title: 'Student assigned', body: `${s.name} is now on ${route.routeName}.` })
      setAssignedIds((prev) => new Set(prev).add(s.id))
      // Re-fetch route + assignments so the parent reflects the new count
      await onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Assignment failed', body: e.message })
    } finally {
      setAssigning(null)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            Assign Students to {route.routeName}
          </DialogTitle>
          <DialogDescription>
            {route.assignedCount} / {route.capacity} seats taken. Pick students below to assign them to this route.
            Students already on another route will be reassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or admission no…"
              className="pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            {filtered.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No students match.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.slice(0, 200).map((s) => {
                  const isOnThisRoute = assignedIds.has(s.id)
                  const otherAssignment = existingAssignments.find((a) => a.studentId === s.id && a.routeId !== route.id)
                  return (
                    <li key={s.id} className="flex items-center gap-3 p-3">
                      <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.admissionNo ? `${s.admissionNo} · ` : ''}{s.className ?? '—'}
                        </p>
                      </div>
                      {otherAssignment && !isOnThisRoute && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                          On {otherAssignment.routeName}
                        </Badge>
                      )}
                      {isOnThisRoute ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> On route
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => assignOne(s)}
                          disabled={assigning === s.id || route.assignedCount >= route.capacity}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          {assigning === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Assign
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 text-white hover:bg-emerald-700">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
