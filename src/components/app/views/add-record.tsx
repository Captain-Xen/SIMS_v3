'use client'

import { useState } from 'react'
import {
  UserPlus, BadgeCheck, Save, Loader2, CheckCircle2, RotateCcw, User, Mail, Phone,
  Calendar, Droplet, IdCard, GraduationCap, Users, Building2, Shield,
} from 'lucide-react'
import { api, gradeToForm } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const GRADES = [7, 8, 9, 10, 11, 12, 13]
const STAFF_ROLES = ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse', 'Ancillary Staff']
const STAFF_DEPARTMENTS = ['Administration', 'Mathematics', 'Science', 'Languages', 'Humanities', 'Business', 'Arts', 'Physical Education', 'Health', 'Ancillary']
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}{label}
      </Label>
      {children}
    </div>
  )
}

export function AddRecordView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-lg">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold">Add Record</h2>
            <p className="mt-0.5 text-sm text-brand-foreground/80">Quickly register a new student or staff member</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="student" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student" className="gap-1.5"><User className="h-4 w-4" /> Add Student</TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5"><BadgeCheck className="h-4 w-4" /> Add Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="student" className="mt-4"><StudentForm /></TabsContent>
        <TabsContent value="staff" className="mt-4"><StaffForm /></TabsContent>
      </Tabs>
    </div>
  )
}

function StudentForm() {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<{ name: string } | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', dob: '', gender: 'Male', bloodGroup: 'O+',
    admissionNo: '', grade: 7, class: '7A', guardian: '', phone: '',
  })

  async function save() {
    if (!form.name.trim()) {
      addToast({ type: 'warning', title: 'Missing name', body: 'A full name is required.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/students', { method: 'POST', body: form })
      setSuccess({ name: form.name })
      addToast({ type: 'success', title: 'Student added', body: `${form.name} was added successfully.` })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to add student', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm({ name: '', email: '', dob: '', gender: 'Male', bloodGroup: 'O+', admissionNo: '', grade: 7, class: '7A', guardian: '', phone: '' })
    setSuccess(null)
  }

  if (success) {
    return <SuccessCard title="Student Added" name={success.name} onReset={reset} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-brand" /> New Student</CardTitle>
        <CardDescription>Fill in the details below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" icon={User}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></Field>
          <Field label="Email" icon={Mail}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@edu.edu" /></Field>
          <Field label="Date of Birth" icon={Calendar}><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label="Gender"><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></Field>
          <Field label="Blood Group" icon={Droplet}><Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Admission No." icon={IdCard}><Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="Auto-generated if blank" /></Field>
          <Field label="Grade/Form" icon={GraduationCap}><Select value={String(form.grade)} onValueChange={(v) => setForm({ ...form, grade: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADES.map((g) => <SelectItem key={g} value={String(g)}>{gradeToForm(g)}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Class" icon={Users}><Select value={form.class} onValueChange={(v) => setForm({ ...form, class: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Guardian Name"><Input value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} placeholder="Parent/Guardian" /></Field>
          <Field label="Guardian Phone" icon={Phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0100" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Add Student
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StaffForm() {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<{ name: string } | null>(null)
  const [subjectsText, setSubjectsText] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', role: 'Teacher', department: 'Mathematics', phone: '', status: 'Active',
  })

  async function save() {
    if (!form.name.trim()) {
      addToast({ type: 'warning', title: 'Missing name', body: 'A full name is required.' })
      return
    }
    setSaving(true)
    try {
      const subjects = subjectsText.split(',').map((s) => s.trim()).filter(Boolean)
      await api('/api/staff', { method: 'POST', body: { ...form, subjects } })
      setSuccess({ name: form.name })
      addToast({ type: 'success', title: 'Staff added', body: `${form.name} was added successfully.` })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to add staff', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm({ name: '', email: '', role: 'Teacher', department: 'Mathematics', phone: '', status: 'Active' })
    setSubjectsText('')
    setSuccess(null)
  }

  if (success) {
    return <SuccessCard title="Staff Added" name={success.name} onReset={reset} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="h-4 w-4 text-brand" /> New Staff Member</CardTitle>
        <CardDescription>Fill in the details below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" icon={User}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" /></Field>
          <Field label="Email" icon={Mail}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@edu.edu" /></Field>
          <Field label="Role" icon={Shield}><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Department" icon={Building2}><Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAFF_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Phone" icon={Phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-0200" /></Field>
          <Field label="Status"><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Suspended">Suspended</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></Field>
        </div>
        <Field label="Subjects (comma-separated)"><Input value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} placeholder="Mathematics, Physics" /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand-strong">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Add Staff
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SuccessCard({ title, name, onReset }: { title: string; name: string; onReset: () => void }) {
  return (
    <Card className="border-brand/35 dark:border-brand/30">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/15">
          <CheckCircle2 className="h-9 w-9 text-brand" />
        </div>
        <p className="text-lg font-bold text-brand-strong dark:text-brand">{title}</p>
        <p className="text-sm text-muted-foreground"><strong>{name}</strong> has been added to the system.</p>
        <Button variant="outline" onClick={onReset}><RotateCcw className="h-4 w-4" /> Add Another</Button>
      </CardContent>
    </Card>
  )
}
