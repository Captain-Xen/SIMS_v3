'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FileText, Download, Printer, GraduationCap, ClipboardCheck, DollarSign, Users,
  Loader2, Search, Check, Award, TrendingUp, BookOpen, FileBarChart,
  Wallet, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { api, gradeToForm, scoreToLetter } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student, Grade, Attendance, Fee } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']
const CURRENT_TERM = 'Term 1'

// School branding used on every printed report — comes from live-synced settings.
interface SchoolInfo { name: string; tagline: string }
const DEFAULT_SCHOOL: SchoolInfo = { name: 'EduCenterJM', tagline: 'Excellence in Education' }

const REPORT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; padding: 40px; color: #1e293b; max-width: 820px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, var(--brand) 0%, #0d9488 60%, #14b8a6 100%); color: #fff; padding: 28px 36px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(5,150,105,0.25); }
  .header h1 { font-family: Georgia, serif; margin: 0; font-size: 30px; letter-spacing: -0.5px; }
  .header .tag { margin: 6px 0 0; opacity: 0.95; font-size: 14px; font-style: italic; }
  .header .badge { display: inline-block; margin-top: 12px; padding: 5px 14px; background: rgba(255,255,255,0.22); border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; }
  .info-grid { margin: 22px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; padding: 18px 24px; background: #f0fdf4; border-left: 4px solid var(--brand); border-radius: 6px; }
  .info-grid div { font-size: 14px; line-height: 1.8; }
  .info-grid strong { display: inline-block; min-width: 110px; color: #475569; }
  h2.section { font-family: Georgia, serif; color: var(--brand-strong); font-size: 18px; margin: 26px 0 12px; border-bottom: 2px solid var(--brand-tint-soft); padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: var(--brand-tint-faint); padding: 12px; text-align: left; border-bottom: 2px solid var(--brand); font-weight: 700; font-size: 12px; color: var(--brand-strong); text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary { margin: 20px 0; padding: 18px 22px; background: linear-gradient(135deg, var(--brand-tint-faint), #f0fdfa); border-radius: 8px; border: 1px solid var(--brand-tint-soft); display: flex; justify-content: space-between; align-items: center; }
  .summary .avg { font-size: 34px; font-weight: bold; color: var(--brand); line-height: 1; }
  .summary .lbl { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .remarks { margin: 20px 0; padding: 16px 20px; background: #fefce8; border-left: 4px solid #ca8a04; border-radius: 4px; font-size: 14px; line-height: 1.65; }
  .signature { margin-top: 72px; display: flex; justify-content: space-around; }
  .sig-line { border-top: 1.5px solid #475569; padding-top: 6px; width: 220px; font-size: 13px; color: #475569; text-align: center; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; color: #64748b; font-size: 11px; font-family: Arial, sans-serif; }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status-Present { background: var(--brand-tint-soft); color: var(--brand-strong); }
  .status-Late { background: #fef3c7; color: #92400e; }
  .status-Absent { background: #fee2e2; color: #b91c1c; }
  .note { margin: 16px 0; padding: 12px 16px; background: #f1f5f9; border-radius: 6px; font-size: 13px; color: #475569; font-style: italic; }
  @media print { body { padding: 0; max-width: none; } .no-print { display: none; } }
`

function printReport(title: string, body: string): boolean {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${REPORT_STYLES}</style></head><body>${body}</body></html>`)
  win.document.close()
  setTimeout(() => { try { win.focus(); win.print() } catch { /* popup blocked */ } }, 300)
  return true
}

function remarksFor(avg: number): string {
  if (avg >= 90) return 'Outstanding achievement. Demonstrates mastery across all subjects and sets a benchmark for peers.'
  if (avg >= 80) return 'Excellent performance. Consistently produces work of a high standard. Keep up the great effort.'
  if (avg >= 65) return 'Good performance. With continued dedication and focused study, even greater results are within reach.'
  if (avg >= 50) return 'Satisfactory progress. More consistent revision and active participation in class will lead to improvement.'
  return 'Improvement needed. We strongly encourage attending extra-help sessions and meeting with subject teachers to build a recovery plan.'
}

function letterColor(score: number): string {
  if (score >= 80) return 'var(--brand)'
  if (score >= 65) return '#0d9488'
  if (score >= 50) return '#ca8a04'
  return '#dc2626'
}

function generateReportCard(student: Student, grades: Grade[], term: string, school: SchoolInfo = DEFAULT_SCHOOL) {
  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  const letter = scoreToLetter(avg)
  const rows = grades.length
    ? grades.map((g) => `<tr><td>${g.subject}</td><td style="text-align:center">${g.score}%</td><td style="text-align:center;font-weight:700;color:${letterColor(g.score)}">${scoreToLetter(g.score)}</td></tr>`).join('')
    : `<tr><td colspan="3" style="text-align:center;padding:24px;color:#64748b">No grades recorded for this term.</td></tr>`

  const body = `
    <div class="header">
      <h1>${school.name}</h1>
      <p class="tag">${school.tagline} &middot; Est. 1995</p>
      <span class="badge">Academic Report Card</span>
    </div>
    <div class="info-grid">
      <div><strong>Student:</strong> ${student.name}</div>
      <div><strong>Admission No:</strong> ${student.admissionNo ?? '—'}</div>
      <div><strong>Form:</strong> ${gradeToForm(student.grade)}</div>
      <div><strong>Class:</strong> ${student.className ?? '—'}</div>
      <div><strong>Term:</strong> ${term}</div>
      <div><strong>Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <h2 class="section">Subject Results</h2>
    <table>
      <thead><tr><th>Subject</th><th style="text-align:center">Score</th><th style="text-align:center">Grade</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div><div class="lbl">Overall Average</div><div class="avg">${avg}%</div></div>
      <div style="text-align:right"><div class="lbl">Letter Grade</div><div style="font-size:34px;font-weight:bold;color:${letterColor(avg)}">${letter}</div></div>
    </div>
    <div class="remarks"><strong>Teacher's Remarks:</strong> ${remarksFor(avg)}</div>
    <div class="signature">
      <div class="sig-line">Class Teacher</div>
      <div class="sig-line">Principal</div>
    </div>
    <div class="footer">
      <span>Generated on ${new Date().toLocaleString()}</span>
      <span>${school.name} &middot; School Management System</span>
    </div>`
  return printReport(`Report Card - ${student.name}`, body)
}

function generateAttendanceReport(student: Student, attendance: Attendance[], school: SchoolInfo = DEFAULT_SCHOOL) {
  const today = new Date().toISOString().slice(0, 10)
  const todayRec = attendance.find((a) => a.date === today)
  const todayStatus = todayRec?.status ?? 'Not Recorded'
  const present = attendance.filter((a) => a.status === 'Present').length
  const late = attendance.filter((a) => a.status === 'Late').length
  const absent = attendance.filter((a) => a.status === 'Absent').length
  const total = attendance.length || 1
  const rate = Math.round((present / total) * 100)

  const rows = attendance.length
    ? attendance.slice().reverse().map((a) => `<tr><td>${new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td><td><span class="status-pill status-${a.status}">${a.status}</span></td></tr>`).join('')
    : `<tr><td colspan="2" style="text-align:center;padding:24px;color:#64748b">No attendance records on file.</td></tr>`

  const body = `
    <div class="header">
      <h1>${school.name}</h1>
      <p class="tag">${school.tagline} &middot; Est. 1995</p>
      <span class="badge">Attendance Report</span>
    </div>
    <div class="info-grid">
      <div><strong>Student:</strong> ${student.name}</div>
      <div><strong>Admission No:</strong> ${student.admissionNo ?? '—'}</div>
      <div><strong>Form:</strong> ${gradeToForm(student.grade)}</div>
      <div><strong>Class:</strong> ${student.className ?? '—'}</div>
      <div><strong>Today's Status:</strong> <span class="status-pill status-${todayStatus}">${todayStatus}</span></div>
      <div><strong>Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="summary">
      <div><div class="lbl">Attendance Rate</div><div class="avg">${rate}%</div></div>
      <div style="text-align:right"><div class="lbl">Records on File</div><div style="font-size:34px;font-weight:bold;color:#0d9488">${attendance.length}</div></div>
    </div>
    <h2 class="section">Attendance Breakdown</h2>
    <table>
      <thead><tr><th>Status</th><th style="text-align:center">Count</th><th style="text-align:center">Percentage</th></tr></thead>
      <tbody>
        <tr><td><span class="status-pill status-Present">Present</span></td><td style="text-align:center">${present}</td><td style="text-align:center">${Math.round((present/total)*100)}%</td></tr>
        <tr><td><span class="status-pill status-Late">Late</span></td><td style="text-align:center">${late}</td><td style="text-align:center">${Math.round((late/total)*100)}%</td></tr>
        <tr><td><span class="status-pill status-Absent">Absent</span></td><td style="text-align:center">${absent}</td><td style="text-align:center">${Math.round((absent/total)*100)}%</td></tr>
      </tbody>
    </table>
    <h2 class="section">Recent Records</h2>
    <table>
      <thead><tr><th>Date</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="note">Note: Historical attendance data is recorded daily by class teachers. For a complete multi-term history, please contact the school office.</div>
    <div class="signature">
      <div class="sig-line">Class Teacher</div>
      <div class="sig-line">Attendance Officer</div>
    </div>
    <div class="footer">
      <span>Generated on ${new Date().toLocaleString()}</span>
      <span>${school.name} &middot; School Management System</span>
    </div>`
  return printReport(`Attendance Report - ${student.name}`, body)
}

function generateFeeStatement(student: Student, fees: Fee[], school: SchoolInfo = DEFAULT_SCHOOL) {
  const paid = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
  const pending = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
  const total = paid + pending
  const balance = pending

  const rows = fees.length
    ? fees.map((f) => `<tr><td>${f.term ?? '—'}</td><td>${new Date(f.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td><td style="text-align:right">$${f.amount.toLocaleString()}</td><td style="text-align:center"><span class="status-pill ${f.status === 'Paid' ? 'status-Present' : 'status-Late'}">${f.status}</span></td></tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b">No fee records on file.</td></tr>`

  const body = `
    <div class="header">
      <h1>${school.name}</h1>
      <p class="tag">${school.tagline} &middot; Est. 1995</p>
      <span class="badge">Fee Statement</span>
    </div>
    <div class="info-grid">
      <div><strong>Student:</strong> ${student.name}</div>
      <div><strong>Admission No:</strong> ${student.admissionNo ?? '—'}</div>
      <div><strong>Form:</strong> ${gradeToForm(student.grade)}</div>
      <div><strong>Class:</strong> ${student.className ?? '—'}</div>
      <div><strong>Account Status:</strong> ${balance === 0 ? 'Clear' : 'Outstanding Balance'}</div>
      <div><strong>Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="summary">
      <div><div class="lbl">Total Billed</div><div class="avg" style="color:#0d9488">$${total.toLocaleString()}</div></div>
      <div style="text-align:right"><div class="lbl">Outstanding Balance</div><div style="font-size:34px;font-weight:bold;color:${balance === 0 ? 'var(--brand)' : '#dc2626'}">$${balance.toLocaleString()}</div></div>
    </div>
    <h2 class="section">Transaction History</h2>
    <table>
      <thead><tr><th>Term</th><th>Due Date</th><th style="text-align:right">Amount</th><th style="text-align:center">Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="remarks"><strong>Summary:</strong> Paid $${paid.toLocaleString()} of $${total.toLocaleString()} total. ${balance === 0 ? 'Account is fully settled. Thank you for your prompt payment.' : `Outstanding balance of $${balance.toLocaleString()} is due. Please arrange payment at the finance office.`}</div>
    <div class="signature">
      <div class="sig-line">Finance Officer</div>
      <div class="sig-line">Principal</div>
    </div>
    <div class="footer">
      <span>Generated on ${new Date().toLocaleString()}</span>
      <span>${school.name} &middot; School Management System</span>
    </div>`
  return printReport(`Fee Statement - ${student.name}`, body)
}

function generateClassSummary(
  className: string,
  classStudents: Student[],
  classGrades: Record<string, Grade[]>,
  classAttendance: Attendance[],
  school: SchoolInfo = DEFAULT_SCHOOL,
) {
  const today = new Date().toISOString().slice(0, 10)
  const rows = classStudents.map((s) => {
    const gs = classGrades[s.id] ?? []
    const avg = gs.length ? Math.round(gs.reduce((a, g) => a + g.score, 0) / gs.length) : 0
    const letter = gs.length ? scoreToLetter(avg) : '—'
    const att = classAttendance.find((a) => a.studentId === s.id && a.date === today)
    const status = att?.status ?? '—'
    return `<tr><td>${s.name}</td><td style="text-align:center">${s.admissionNo ?? '—'}</td><td style="text-align:center">${gs.length || '—'}</td><td style="text-align:center;font-weight:700;color:${gs.length ? letterColor(avg) : '#64748b'}">${gs.length ? avg + '%' : '—'}</td><td style="text-align:center;font-weight:700;color:${gs.length ? letterColor(avg) : '#64748b'}">${letter}</td><td style="text-align:center">${status !== '—' ? `<span class="status-pill status-${status}">${status}</span>` : '—'}</td></tr>`
  }).join('')

  const allAvgs = classStudents.map((s) => {
    const gs = classGrades[s.id] ?? []
    return gs.length ? gs.reduce((a, g) => a + g.score, 0) / gs.length : 0
  }).filter((v) => v > 0)
  const classAvg = allAvgs.length ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : 0
  const presentToday = classAttendance.filter((a) => a.date === today && a.status === 'Present').length
  const attRate = classStudents.length ? Math.round((presentToday / classStudents.length) * 100) : 0

  const body = `
    <div class="header">
      <h1>${school.name}</h1>
      <p class="tag">${school.tagline} &middot; Est. 1995</p>
      <span class="badge">Class Summary - ${className}</span>
    </div>
    <div class="info-grid">
      <div><strong>Class:</strong> ${className}</div>
      <div><strong>Students:</strong> ${classStudents.length}</div>
      <div><strong>Class Average:</strong> ${classAvg}%</div>
      <div><strong>Attendance Today:</strong> ${attRate}%</div>
      <div><strong>Term:</strong> ${CURRENT_TERM}</div>
      <div><strong>Issued:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    <div class="summary">
      <div><div class="lbl">Class Average</div><div class="avg">${classAvg}%</div></div>
      <div style="text-align:right"><div class="lbl">Attendance Today</div><div style="font-size:34px;font-weight:bold;color:#0d9488">${attRate}%</div></div>
    </div>
    <h2 class="section">Student Roster</h2>
    <table>
      <thead><tr><th>Student</th><th style="text-align:center">Adm. No</th><th style="text-align:center">Subjects</th><th style="text-align:center">Average</th><th style="text-align:center">Grade</th><th style="text-align:center">Today</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b">No students in this class.</td></tr>`}</tbody>
    </table>
    <div class="signature">
      <div class="sig-line">Class Teacher</div>
      <div class="sig-line">Principal</div>
    </div>
    <div class="footer">
      <span>Generated on ${new Date().toLocaleString()}</span>
      <span>${school.name} &middot; School Management System</span>
    </div>`
  return printReport(`Class Summary - ${className}`, body)
}

export function ReportsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const settings = useAppStore((s) => s.settings)
  const school: SchoolInfo = {
    name: settings?.name || 'EduCenterJM',
    tagline: settings?.tagline || 'Excellence in Education',
  }
  const isStudent = user.role === 'Student'

  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<'card' | 'attendance' | 'fees' | 'class'>('card')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [studentSearch, setStudentSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [classGrades, setClassGrades] = useState<Record<string, Grade[]>>({})
  const [classAttendance, setClassAttendance] = useState<Attendance[]>([])
  const [classLoading, setClassLoading] = useState(false)
  const [studentLoading, setStudentLoading] = useState(false)

  // Initial load: students for staff, own data for students
  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (isStudent) {
          const today = new Date().toISOString().slice(0, 10)
          const [gRes, fRes, attRes] = await Promise.all([
            api<{ grades: Grade[] }>('/api/grades', { query: { studentId: user.id } }),
            api<{ fees: Fee[] }>('/api/fees'),
            api<{ attendance: Attendance[] }>('/api/attendance', { query: { date: today } }),
          ])
          if (!active) return
          setGrades(gRes.grades)
          setFees(fRes.fees.filter((f) => f.studentId === user.id))
          setAttendance(attRes.attendance.filter((a) => a.studentId === user.id))
        } else {
          const sRes = await api<{ students: Student[] }>('/api/students')
          if (!active) return
          setStudents(sRes.students)
        }
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load data', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [isStudent, user.id, addToast])

  // Staff: load selected student's data
  useEffect(() => {
    if (isStudent || !selectedStudentId) return
    let active = true
    async function loadStudent() {
      setStudentLoading(true)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const [gRes, fRes, attRes] = await Promise.all([
          api<{ grades: Grade[] }>('/api/grades', { query: { studentId: selectedStudentId } }),
          api<{ fees: Fee[] }>('/api/fees'),
          api<{ attendance: Attendance[] }>('/api/attendance', { query: { date: today } }),
        ])
        if (!active) return
        setGrades(gRes.grades)
        setFees(fRes.fees.filter((f) => f.studentId === selectedStudentId))
        setAttendance(attRes.attendance.filter((a) => a.studentId === selectedStudentId))
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load student data', body: e.message })
      } finally {
        if (active) setStudentLoading(false)
      }
    }
    loadStudent()
    return () => { active = false }
  }, [isStudent, selectedStudentId, addToast])

  // Staff: load class summary data
  useEffect(() => {
    if (isStudent || reportType !== 'class' || !selectedClass) return
    let active = true
    async function loadClass() {
      setClassLoading(true)
      try {
        const classStudents = students.filter((s) => s.className === selectedClass)
        const classIds = new Set(classStudents.map((s) => s.id))
        const today = new Date().toISOString().slice(0, 10)
        const [gRes, attRes] = await Promise.all([
          api<{ grades: Grade[] }>('/api/grades'),
          api<{ attendance: Attendance[] }>('/api/attendance', { query: { date: today } }),
        ])
        if (!active) return
        const map: Record<string, Grade[]> = {}
        for (const g of gRes.grades) {
          if (classIds.has(g.studentId)) {
            if (!map[g.studentId]) map[g.studentId] = []
            map[g.studentId].push(g)
          }
        }
        setClassGrades(map)
        setClassAttendance(attRes.attendance.filter((a) => classIds.has(a.studentId)))
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load class data', body: e.message })
      } finally {
        if (active) setClassLoading(false)
      }
    }
    loadClass()
    return () => { active = false }
  }, [isStudent, reportType, selectedClass, students, addToast])

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students
    const q = studentSearch.toLowerCase()
    return students.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.admissionNo ?? '').toLowerCase().includes(q),
    )
  }, [students, studentSearch])

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null
  const studentRecord = isStudent
    ? students.find((s) => s.id === user.id) ?? null
    : selectedStudent

  const avgScore = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  const topGrade = grades.length ? scoreToLetter(Math.max(...grades.map((g) => g.score))) : '—'

  function handleGenerate(explicitType?: 'card' | 'attendance' | 'fees' | 'class') {
    const rt = explicitType ?? reportType
    if (isStudent) {
      const me: Student = {
        id: user.id, name: user.name, email: user.email, dob: null, gender: null, bloodGroup: null,
        admissionNo: null, grade: user.grade, className: user.className, guardian: null, phone: user.phone,
        status: user.status, avatar: user.avatar, feeStatus: '—', detentions: 0, suspensions: 0,
      }
      const target = studentRecord ?? me
      let ok = false
      if (rt === 'card') ok = generateReportCard(target, grades, CURRENT_TERM, school)
      else if (rt === 'attendance') ok = generateAttendanceReport(target, attendance, school)
      else if (rt === 'fees') ok = generateFeeStatement(target, fees, school)
      if (ok) addToast({ type: 'success', title: 'Report generated', body: 'Use your browser\'s print dialog to save as PDF.' })
      else addToast({ type: 'error', title: 'Popup blocked', body: 'Please allow popups to generate reports.' })
      return
    }
    if (rt === 'class') {
      if (!selectedClass) { addToast({ type: 'warning', title: 'Select a class', body: 'Choose a class to generate the summary.' }); return }
      const classStudents = students.filter((s) => s.className === selectedClass)
      const ok = generateClassSummary(selectedClass, classStudents, classGrades, classAttendance, school)
      if (ok) addToast({ type: 'success', title: 'Class summary generated', body: `${classStudents.length} students included.` })
      else addToast({ type: 'error', title: 'Popup blocked', body: 'Please allow popups to generate reports.' })
      return
    }
    if (!selectedStudent) { addToast({ type: 'warning', title: 'Select a student', body: 'Choose a student to generate the report.' }); return }
    let ok = false
    if (rt === 'card') ok = generateReportCard(selectedStudent, grades, CURRENT_TERM, school)
    else if (rt === 'attendance') ok = generateAttendanceReport(selectedStudent, attendance, school)
    else if (rt === 'fees') ok = generateFeeStatement(selectedStudent, fees, school)
    if (ok) addToast({ type: 'success', title: 'Report generated', body: 'Use your browser\'s print dialog to save as PDF.' })
    else addToast({ type: 'error', title: 'Popup blocked', body: 'Please allow popups to generate reports.' })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ===== STUDENT VIEW =====
  if (isStudent) {
    const me: Student = {
      id: user.id, name: user.name, email: user.email, dob: null, gender: null, bloodGroup: null,
      admissionNo: null, grade: user.grade, className: user.className, guardian: null, phone: user.phone,
      status: user.status, avatar: user.avatar, feeStatus: '—', detentions: 0, suspensions: 0,
    }
    const target = studentRecord ?? me
    const totalBilled = fees.reduce((a, f) => a + f.amount, 0)
    const outstanding = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
    const todayAtt = attendance.find((a) => a.date === new Date().toISOString().slice(0, 10))

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <CardContent className="relative p-6 sm:p-7">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-brand-foreground/90">
                  <FileText className="h-4 w-4" /> Reports &amp; Transcripts
                </p>
                <h2 className="mt-1.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl">My Academic Reports</h2>
                <p className="mt-1.5 text-sm text-brand-foreground/85">Download your report card, attendance summary, and fee statement.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button onClick={() => handleGenerate('card')} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                  <Download className="h-4 w-4" /> Report Card
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stat tiles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile icon={TrendingUp} label="Average Score" value={grades.length ? `${avgScore}%` : '—'} sub={grades.length ? `Grade ${scoreToLetter(avgScore)}` : 'No grades'} color="emerald" />
          <StatTile icon={BookOpen} label="Subjects" value={String(grades.length)} sub={CURRENT_TERM} color="teal" />
          <StatTile icon={Award} label="Top Grade" value={topGrade} sub={grades.length ? `${Math.max(...grades.map((g) => g.score))}%` : '—'} color="amber" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Academic overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-brand" /> Academic Overview</CardTitle>
              <CardDescription>Your grades for {CURRENT_TERM}</CardDescription>
            </CardHeader>
            <CardContent>
              {grades.length === 0 ? (
                <EmptyState icon={BookOpen} title="No grades yet" body="Your teachers haven't recorded grades for this term." />
              ) : (
                <div className="space-y-2">
                  {grades.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-brand/10 font-bold text-brand-strong dark:bg-brand/15 dark:text-brand">{g.score}%</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{g.subject}</p>
                        <p className="text-xs text-muted-foreground">{g.term}</p>
                      </div>
                      <Badge variant="outline" className={cn('font-bold', g.score >= 80 ? 'text-brand' : g.score >= 60 ? 'text-amber-600' : 'text-red-600')}>{scoreToLetter(g.score)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download center */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-brand" /> Download Center</CardTitle>
                <CardDescription>Save or print official reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => handleGenerate('card')} className="w-full justify-start bg-brand text-brand-foreground hover:bg-brand-strong">
                  <FileText className="h-4 w-4" /> Report Card
                </Button>
                <Button onClick={() => handleGenerate('attendance')} variant="outline" className="w-full justify-start">
                  <ClipboardCheck className="h-4 w-4" /> Attendance Report
                </Button>
                <Button onClick={() => handleGenerate('fees')} variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4" /> Fee Statement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Account Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <SummaryRow icon={Wallet} label="Total Billed" value={`$${totalBilled.toLocaleString()}`} />
                <SummaryRow icon={AlertCircle} label="Outstanding" value={`$${outstanding.toLocaleString()}`} valueClass={outstanding > 0 ? 'text-red-600' : 'text-brand'} />
                <Separator />
                <SummaryRow icon={todayAtt?.status === 'Present' ? CheckCircle2 : todayAtt?.status === 'Late' ? Clock : AlertCircle} label="Today's Attendance" value={todayAtt?.status ?? 'Not Recorded'} valueClass={todayAtt?.status === 'Present' ? 'text-brand' : todayAtt?.status === 'Late' ? 'text-amber-600' : 'text-red-600'} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ===== STAFF VIEW =====
  const classStudents = students.filter((s) => s.className === selectedClass)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative p-6 sm:p-7">
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand-foreground/90">
            <FileBarChart className="h-4 w-4" /> Reports &amp; Transcripts
          </p>
          <h2 className="mt-1.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl">Report Generation Center</h2>
          <p className="mt-1.5 text-sm text-brand-foreground/85">Generate printable report cards, attendance reports, fee statements, and class summaries.</p>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Total Students" value={String(students.length)} sub="All forms" color="emerald" />
        <StatTile icon={FileText} label="Report Types" value="4" sub="Available" color="teal" />
        <StatTile icon={GraduationCap} label="Active Classes" value={String(new Set(students.map((s) => s.className).filter(Boolean)).size)} sub="Forms 1-6" color="amber" />
        <StatTile icon={Download} label="Quick Access" value="PDF" sub="Print-ready" color="cyan" />
      </div>

      <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="card"><FileText className="mr-1.5 h-4 w-4" /> Report Card</TabsTrigger>
          <TabsTrigger value="attendance"><ClipboardCheck className="mr-1.5 h-4 w-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="mr-1.5 h-4 w-4" /> Fee Statement</TabsTrigger>
          <TabsTrigger value="class"><Users className="mr-1.5 h-4 w-4" /> Class Summary</TabsTrigger>
        </TabsList>

        {/* Report Card / Attendance / Fee Statement tabs all need a student */}
        <TabsContent value="card" className="space-y-4">
          <ReportConfigCard
            title="Report Card"
            description="A full academic transcript with subject scores, letter grades, average, and teacher remarks."
            icon={FileText}
          >
            <StudentPicker
              students={students}
              filtered={filteredStudents}
              search={studentSearch}
              onSearch={(v) => { setStudentSearch(v); setDropdownOpen(true); if (selectedStudentId) setSelectedStudentId('') }}
              onOpen={() => setDropdownOpen(true)}
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              selectedId={selectedStudentId}
              onSelect={(s) => { setSelectedStudentId(s.id); setStudentSearch(s.name); setDropdownOpen(false) }}
            />
            {selectedStudent && <StudentPreviewCard student={selectedStudent} loading={studentLoading} grades={grades} />}
          </ReportConfigCard>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <ReportConfigCard
            title="Attendance Report"
            description="A summary of the student's attendance including today's status, rate, and recent records."
            icon={ClipboardCheck}
          >
            <StudentPicker
              students={students}
              filtered={filteredStudents}
              search={studentSearch}
              onSearch={(v) => { setStudentSearch(v); setDropdownOpen(true); if (selectedStudentId) setSelectedStudentId('') }}
              onOpen={() => setDropdownOpen(true)}
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              selectedId={selectedStudentId}
              onSelect={(s) => { setSelectedStudentId(s.id); setStudentSearch(s.name); setDropdownOpen(false) }}
            />
            {selectedStudent && <AttendancePreview student={selectedStudent} attendance={attendance} loading={studentLoading} />}
          </ReportConfigCard>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <ReportConfigCard
            title="Fee Statement"
            description="A financial record showing all fee charges, payment status, due dates, and the outstanding balance."
            icon={DollarSign}
          >
            <StudentPicker
              students={students}
              filtered={filteredStudents}
              search={studentSearch}
              onSearch={(v) => { setStudentSearch(v); setDropdownOpen(true); if (selectedStudentId) setSelectedStudentId('') }}
              onOpen={() => setDropdownOpen(true)}
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              selectedId={selectedStudentId}
              onSelect={(s) => { setSelectedStudentId(s.id); setStudentSearch(s.name); setDropdownOpen(false) }}
            />
            {selectedStudent && <FeePreview student={selectedStudent} fees={fees} loading={studentLoading} />}
          </ReportConfigCard>
        </TabsContent>

        <TabsContent value="class" className="space-y-4">
          <ReportConfigCard
            title="Class Summary"
            description="A roster-level overview showing every student in a class with their average grade and today's attendance."
            icon={Users}
          >
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c} ({students.filter((s) => s.className === c).length} students)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <ClassPreview
                className={selectedClass}
                students={classStudents}
                classGrades={classGrades}
                classAttendance={classAttendance}
                loading={classLoading}
              />
            )}
          </ReportConfigCard>
        </TabsContent>
      </Tabs>

      {/* Generate button */}
      <Card className="border-brand/25 bg-brand/5 dark:border-brand/40 dark:bg-brand/10">
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{reportType === 'class' ? 'Generate Class Summary' : 'Generate Printable Report'}</p>
              <p className="text-sm text-muted-foreground">
                {reportType === 'class'
                  ? selectedClass ? `${classStudents.length} students in ${selectedClass}` : 'Select a class first'
                  : selectedStudent ? `For ${selectedStudent.name}` : 'Select a student first'}
              </p>
            </div>
          </div>
          <Button onClick={handleGenerate} className="bg-brand text-brand-foreground hover:bg-brand-strong" disabled={reportType === 'class' ? !selectedClass : !selectedStudent}>
            <Download className="h-4 w-4" /> Generate &amp; Print
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== Sub-components =====

function StatTile({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', colors[color])}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-[10px] font-semibold text-brand dark:text-brand">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn('h-4 w-4 shrink-0 text-muted-foreground', valueClass)} />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold', valueClass)}>{value}</span>
    </div>
  )
}

function ReportConfigCard({ title, description, icon: Icon, children }: { title: string; description: string; icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-brand" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function StudentPicker({
  students, filtered, search, onSearch, onOpen, open, onClose, selectedId, onSelect,
}: {
  students: Student[]
  filtered: Student[]
  search: string
  onSearch: (v: string) => void
  onOpen: () => void
  open: boolean
  onClose: () => void
  selectedId: string
  onSelect: (s: Student) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Select Student</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={onOpen}
          placeholder="Search by name, email, or admission no..."
          className="pl-10"
        />
        {selectedId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand" />}
        {open && (
          <>
            <div className="fixed inset-0 z-0" onClick={onClose} />
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No students found. {students.length} total.</p>
              ) : (
                filtered.slice(0, 30).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border p-2.5 text-left transition last:border-b-0 hover:bg-muted',
                      selectedId === s.id && 'bg-brand/5 dark:bg-brand/10',
                    )}
                  >
                    <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.admissionNo} · {gradeToForm(s.grade)} · {s.className}</p>
                    </div>
                    {selectedId === s.id && <Check className="h-4 w-4 text-brand" />}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StudentPreviewCard({ student, loading, grades }: { student: Student; loading: boolean; grades: Grade[] }) {
  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : 0
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UserAvatar name={student.name} avatar={student.avatar} role="Student" size="lg" />
          <div className="flex-1">
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-muted-foreground">{student.admissionNo} · {gradeToForm(student.grade)} · {student.className}</p>
            <p className="text-xs text-muted-foreground">{student.email}</p>
          </div>
          <div className="flex gap-4 sm:flex-col sm:items-end">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand">{grades.length ? `${avg}%` : '—'}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{grades.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Subjects</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AttendancePreview({ student, attendance, loading }: { student: Student; attendance: Attendance[]; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  const today = new Date().toISOString().slice(0, 10)
  const todayRec = attendance.find((a) => a.date === today)
  const present = attendance.filter((a) => a.status === 'Present').length
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <UserAvatar name={student.name} avatar={student.avatar} role="Student" size="md" />
        <div className="flex-1">
          <p className="font-medium">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.className}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-lg font-bold text-brand">{rate}%</p>
          <p className="text-[10px] uppercase text-muted-foreground">Rate</p>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-lg font-bold text-teal-600">{attendance.length}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Records</p>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-sm font-bold text-amber-600">{todayRec?.status ?? '—'}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Today</p>
        </div>
      </div>
    </div>
  )
}

function FeePreview({ student, fees, loading }: { student: Student; fees: Fee[]; loading: boolean }) {
  if (loading) return <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  const paid = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
  const pending = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <UserAvatar name={student.name} avatar={student.avatar} role="Student" size="md" />
        <div className="flex-1">
          <p className="font-medium">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.className}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {fees.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">No fee records.</p>
        ) : (
          fees.slice(0, 4).map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">{f.term ?? '—'} · ${f.amount.toLocaleString()}</span>
              <Badge variant="outline" className={f.status === 'Paid' ? 'text-brand' : 'text-amber-600'}>{f.status}</Badge>
            </div>
          ))
        )}
      </div>
      <Separator />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Outstanding:</span>
        <span className={cn('font-bold', pending > 0 ? 'text-red-600' : 'text-brand')}>${pending.toLocaleString()}</span>
      </div>
    </div>
  )
}

function ClassPreview({
  className, students, classGrades, classAttendance, loading,
}: {
  className: string
  students: Student[]
  classGrades: Record<string, Grade[]>
  classAttendance: Attendance[]
  loading: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const rows = students.map((s) => {
    const gs = classGrades[s.id] ?? []
    const avg = gs.length ? Math.round(gs.reduce((a, g) => a + g.score, 0) / gs.length) : 0
    const att = classAttendance.find((a) => a.studentId === s.id && a.date === today)
    return { s, avg, letter: gs.length ? scoreToLetter(avg) : '—', count: gs.length, status: att?.status ?? '—' }
  })
  const avgs = rows.map((r) => r.avg).filter((v) => v > 0)
  const classAvg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0
  const present = classAttendance.filter((a) => a.date === today && a.status === 'Present').length
  const attRate = students.length ? Math.round((present / students.length) * 100) : 0

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-lg font-bold text-brand">{students.length}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Students</p>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-lg font-bold text-teal-600">{classAvg}%</p>
          <p className="text-[10px] uppercase text-muted-foreground">Class Avg</p>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <p className="text-lg font-bold text-amber-600">{attRate}%</p>
          <p className="text-[10px] uppercase text-muted-foreground">Present Today</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students" body={`No students found in class ${className}.`} />
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="p-2 text-left font-medium">Student</th>
                <th className="p-2 text-center font-medium">Avg</th>
                <th className="p-2 text-center font-medium">Grade</th>
                <th className="p-2 text-center font-medium">Today</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, avg, letter, status }) => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="xs" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.admissionNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center font-semibold">{avg || '—'}{avg ? '%' : ''}</td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className={cn('font-bold', avg >= 80 ? 'text-brand' : avg >= 60 ? 'text-amber-600' : avg > 0 ? 'text-red-600' : '')}>{letter}</Badge>
                  </td>
                  <td className="p-2 text-center">
                    {status !== '—' ? (
                      <Badge variant="outline" className={status === 'Present' ? 'text-brand' : status === 'Late' ? 'text-amber-600' : 'text-red-600'}>{status}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
