'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users, Plus, Search, Trash2, Pencil, Download, Upload, ChevronLeft, ChevronRight,
  CheckSquare, Square, X, Loader2, Filter, Eye, GraduationCap, DollarSign, AlertTriangle,
} from 'lucide-react'
import { api, gradeToForm, initials } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const GRADES = [7, 8, 9, 10, 11, 12, 13]

export function StudentsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const setViewUserId = useAppStore((s) => s.setViewUserId)
  const setActiveView = useAppStore((s) => s.setActiveView)

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Student | null>(null)
  const [adding, setAdding] = useState(false)
  const [carouselIdx, setCarouselIdx] = useState(0)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ students: Student[] }>('/api/students')
      setStudents(res.students)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load students', body: e.message })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (classFilter && s.className !== classFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.admissionNo ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [students, query, classFilter])

  const classCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students) map.set(s.className ?? '?', (map.get(s.className ?? '?') ?? 0) + 1)
    return CLASSES.filter((c) => map.has(c)).map((c) => ({ class: c, count: map.get(c) ?? 0 }))
  }, [students])

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((s) => s.id)))
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} student(s)? This cannot be undone.`)) return
    try {
      await Promise.all(Array.from(selected).map((id) => api(`/api/students/${id}`, { method: 'DELETE' })))
      addToast({ type: 'success', title: 'Deleted', body: `${selected.size} student(s) removed.` })
      setSelected(new Set())
      load()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    }
  }

  function exportCSV() {
    const headers = ['first_name', 'last_name', 'email', 'dob', 'grade', 'class_name', 'guardian_name', 'guardian_phone', 'status']
    const rows = filtered.map((s) => {
      const [first, ...rest] = s.name.split(' ')
      return [first, rest.join(' '), s.email, s.dob ?? '', s.grade ?? '', s.className ?? '', s.guardian ?? '', s.phone ?? '', s.status]
    })
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadCSV(csv, 'students.csv')
    addToast({ type: 'success', title: 'Exported', body: `${filtered.length} students exported to CSV.` })
  }

  function downloadTemplate() {
    const csv = 'first_name,last_name,dob,grade,class_name,guardian_name,guardian_phone\nJohn,Doe,2008-05-12,10,10A,Jane Doe,555-0100'
    downloadCSV(csv, 'students_template.csv')
    addToast({ type: 'info', title: 'Template downloaded' })
  }

  async function importCSV(file: File) {
    const text = await file.text()
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) { addToast({ type: 'warning', title: 'Empty CSV', body: 'No data rows found.' }); return }
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
    let count = 0
    for (const line of lines.slice(1)) {
      const cols = parseCSVLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').replace(/"/g, '') })
      try {
        await api('/api/students', { method: 'POST', body: { name: `${obj.first_name} ${obj.last_name}`, email: obj.email, dob: obj.dob, grade: obj.grade, class: obj.class_name, guardian: obj.guardian_name, phone: obj.guardian_phone } })
        count++
      } catch { /* skip duplicates */ }
    }
    addToast({ type: 'success', title: 'Import complete', body: `${count} student(s) imported.` })
    load()
  }

  const canManage = ['Admin', 'Principal', 'Vice Principal', 'Teacher'].includes(user.role)

  return (
    <div className="space-y-6">
      {/* Class carousel */}
      {classCounts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4 text-brand" /> Browse by Class</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={carouselIdx === 0} onClick={() => setCarouselIdx(Math.max(0, carouselIdx - 3))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={carouselIdx + 3 >= classCounts.length} onClick={() => setCarouselIdx(carouselIdx + 3)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-hidden">
              {classCounts.slice(carouselIdx, carouselIdx + 6).map((c) => (
                <button
                  key={c.class}
                  onClick={() => setClassFilter(classFilter === c.class ? '' : c.class)}
                  className={cn('flex min-w-[110px] flex-1 flex-col items-center rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md', classFilter === c.class ? 'border-brand/60 bg-brand/5 dark:bg-brand/10' : 'border-border hover:border-brand/35 hover:bg-muted/50')}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-bold text-brand-strong dark:bg-brand/15 dark:text-brand">{c.class}</div>
                  <p className="mt-2 text-lg font-bold">{c.count}</p>
                  <p className="text-xs text-muted-foreground">students</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, or ID..." className="pl-10" />
          </div>
          <Select value={classFilter || 'all'} onValueChange={(v) => setClassFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-40"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4" /> Export</Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Upload className="h-4 w-4" /> Template</Button>
            {canManage && <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand-strong" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add Student</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Bulk import (hidden file input) */}
      {canManage && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">Import students from a CSV file.</p>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Choose file</span>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = '' }} />
          </label>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="h-10 w-10 opacity-40" />
              <p className="text-sm">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                        {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 text-brand" /> : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="p-3 text-left font-medium">Student</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Form</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Guardian</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Fees</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border transition hover:bg-muted/40">
                      <td className="p-3">
                        <button onClick={() => toggleSelect(s.id)} className="text-muted-foreground hover:text-foreground">
                          {selected.has(s.id) ? <CheckSquare className="h-4 w-4 text-brand" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => { setViewUserId(s.id); setActiveView('profile') }} className="flex items-center gap-3 text-left">
                          <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="sm" />
                          <div>
                            <p className="font-medium hover:text-brand">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.admissionNo} · {s.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <Badge variant="outline">{gradeToForm(s.grade)}</Badge>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.className}</p>
                      </td>
                      <td className="hidden p-3 lg:table-cell">
                        <p className="text-sm">{s.guardian ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{s.phone ?? ''}</p>
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        <Badge variant={s.feeStatus === 'Paid' ? 'default' : 'secondary'} className={s.feeStatus === 'Paid' ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}>
                          {s.feeStatus}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={s.status === 'Active' ? 'default' : 'destructive'} className={s.status === 'Active' ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : ''}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewUserId(s.id); setActiveView('profile') }}><Eye className="h-4 w-4" /></Button>
                          {canManage && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>}
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

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" variant="destructive" onClick={deleteSelected}><Trash2 className="h-4 w-4" /> Delete</Button>}
        </div>
      )}

      {(adding || editing) && (
        <StudentDialog
          student={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function StudentDialog({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: student?.name ?? '',
    email: student?.email ?? '',
    dob: student?.dob ?? '',
    gender: student?.gender ?? 'Male',
    bloodGroup: student?.bloodGroup ?? 'O+',
    admissionNo: student?.admissionNo ?? '',
    grade: student?.grade ?? 7,
    class: student?.className ?? '7A',
    guardian: student?.guardian ?? '',
    phone: student?.phone ?? '',
    status: student?.status ?? 'Active',
  })

  async function save() {
    setSaving(true)
    try {
      if (student) {
        await api(`/api/students/${student.id}`, { method: 'PATCH', body: form })
        addToast({ type: 'success', title: 'Student updated' })
      } else {
        await api('/api/students', { method: 'POST', body: form })
        addToast({ type: 'success', title: 'Student added', body: `${form.name} was added.` })
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
          <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Full Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Blood Group">
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Admission No."><Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="Auto-generated if blank" /></Field>
          <Field label="Grade/Form">
            <Select value={String(form.grade)} onValueChange={(v) => setForm({ ...form, grade: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={String(g)}>{gradeToForm(g)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Class">
            <Select value={form.class} onValueChange={(v) => setForm({ ...form, class: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Guardian Name"><Input value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} /></Field>
          <Field label="Guardian Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Suspended">Suspended</SelectItem><SelectItem value="Expelled">Expelled</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {student ? 'Save Changes' : 'Add Student'}
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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}
