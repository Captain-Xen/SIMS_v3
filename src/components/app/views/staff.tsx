'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck, Plus, Search, Trash2, Pencil, Download, Loader2, Mail, Phone, Building2, X,
} from 'lucide-react'
import { api, initials } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Staff } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const ROLES = ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse', 'Ancillary Staff']
const DEPARTMENTS = ['Administration', 'Mathematics', 'Science', 'Languages', 'Humanities', 'Business', 'Arts', 'Physical Education', 'Health', 'Ancillary']

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Principal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  'Vice Principal': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  Teacher: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Nurse: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  'Ancillary Staff': 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
}

export function StaffView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const setViewUserId = useAppStore((s) => s.setViewUserId)
  const setActiveView = useAppStore((s) => s.setActiveView)

  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editing, setEditing] = useState<Staff | null>(null)
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ staff: Staff[] }>('/api/staff')
      setStaff(res.staff)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load staff', body: e.message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter && s.role !== roleFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.department ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [staff, query, roleFilter])

  function exportCSV() {
    const headers = ['name', 'email', 'role', 'department', 'phone', 'status']
    const rows = filtered.map((s) => [s.name, s.email, s.role, s.department ?? '', s.phone ?? '', s.status])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadCSV(csv, 'staff.csv')
    addToast({ type: 'success', title: 'Exported', body: `${filtered.length} staff exported to CSV.` })
  }

  async function deleteStaff(s: Staff) {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return
    try {
      await api(`/api/staff/${s.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Deleted', body: `${s.name} removed.` })
      load()
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
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><BadgeCheck className="h-7 w-7" /> Staff Management</h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">Manage teaching and administrative staff records.</p>
          </div>
          <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or department..." className="pl-10" />
          </div>
          <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4" /> Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <BadgeCheck className="h-10 w-10 opacity-40" />
              <p className="text-sm">No staff found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Member</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Role</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Department</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Contact</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border transition hover:bg-muted/40">
                      <td className="p-3">
                        <button onClick={() => { setViewUserId(s.id); setActiveView('profile') }} className="flex items-center gap-3 text-left">
                          <UserAvatar name={s.name} avatar={s.avatar} role={s.role} size="sm" />
                          <div>
                            <p className="font-medium hover:text-emerald-600">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <Badge variant="outline" className={cn('border-transparent', ROLE_COLORS[s.role] ?? '')}>{s.role}</Badge>
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{s.department ?? '—'}</span>
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        {s.phone ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" />{s.phone}</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        <Badge variant={s.status === 'Active' ? 'default' : 'destructive'} className={s.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : ''}>{s.status}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => deleteStaff(s)}><Trash2 className="h-4 w-4" /></Button>
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

      {(adding || editing) && (
        <StaffDialog
          staff={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function StaffDialog({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [subjectsText, setSubjectsText] = useState(() => {
    try { return (JSON.parse(staff?.subjects ?? '[]') as string[]).join(', ') } catch { return '' }
  })
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    role: staff?.role ?? 'Teacher',
    department: staff?.department ?? 'Mathematics',
    phone: staff?.phone ?? '',
    status: staff?.status ?? 'Active',
  })

  async function save() {
    setSaving(true)
    try {
      const subjects = subjectsText.split(',').map((s) => s.trim()).filter(Boolean)
      const payload = { ...form, subjects }
      if (staff) {
        await api(`/api/staff/${staff.id}`, { method: 'PATCH', body: payload })
        addToast({ type: 'success', title: 'Staff updated' })
      } else {
        await api('/api/staff', { method: 'POST', body: payload })
        addToast({ type: 'success', title: 'Staff added', body: `${form.name} was added.` })
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
          <DialogTitle>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Department">
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0100" /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Suspended">Suspended</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subjects (comma-separated)</Label>
            <Input value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} placeholder="Mathematics, Physics" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {staff ? 'Save Changes' : 'Add Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
