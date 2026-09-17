'use client'

import { useEffect, useState } from 'react'
import {
  HelpCircle, Lightbulb, Keyboard, Mail, Phone, ArrowRight, BookOpen,
  GraduationCap, ClipboardCheck, DollarSign, CalendarDays, Megaphone,
  Library, MessagesSquare, Bell, FileText, Settings, Home, ShieldAlert,
  MapPin, Compass, ChevronRight, Sparkles, ClipboardList, Award,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { ViewId, SchoolSettings } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

interface FeatureLink {
  view: ViewId
  label: string
  icon: any
  desc: string
  color: string
}

const FEATURE_LINKS: FeatureLink[] = [
  { view: 'dashboard', label: 'Dashboard', icon: Home, desc: 'Your school at a glance', color: 'emerald' },
  { view: 'grades', label: 'Grades', icon: ClipboardList, desc: 'View & record marks', color: 'teal' },
  { view: 'attendance', label: 'Attendance', icon: ClipboardCheck, desc: 'Daily roll call', color: 'cyan' },
  { view: 'assignments', label: 'Assignments', icon: BookOpen, desc: 'Homework & submissions', color: 'amber' },
  { view: 'library', label: 'Library', icon: Library, desc: 'Borrow & return books', color: 'emerald' },
  { view: 'messages', label: 'Messages', icon: MessagesSquare, desc: 'Chat with staff & students', color: 'teal' },
  { view: 'events', label: 'Events', icon: CalendarDays, desc: 'School calendar', color: 'cyan' },
  { view: 'announcements', label: 'Announcements', icon: Megaphone, desc: 'Latest school news', color: 'amber' },
  { view: 'fees', label: 'Fees', icon: DollarSign, desc: 'Payments & statements', color: 'emerald' },
  { view: 'timetable', label: 'Timetable', icon: CalendarDays, desc: 'Weekly schedule', color: 'teal' },
  { view: 'notifications', label: 'Notifications', icon: Bell, desc: 'Your alerts inbox', color: 'cyan' },
  { view: 'reports', label: 'Reports', icon: FileText, desc: 'Printable transcripts', color: 'amber' },
]

const colorMap: Record<string, string> = {
  emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
}

interface FAQItem { q: string; a: string }

const FAQS: FAQItem[] = [
  {
    q: 'How do I reset my password?',
    a: "Use the \"Forgot Password?\" link on the login screen. Enter your registered email address and you'll receive a reset link. If you don't receive an email within a few minutes, contact the school office — they can reset it from System Settings.",
  },
  {
    q: 'How do I upload a profile picture?',
    a: 'Go to My Profile (click your avatar in the header or the Profile nav item). Click the camera icon on your avatar to upload a JPG or PNG from your device. To revert to the default user icon, click "Remove picture" below your avatar.',
  },
  {
    q: 'How do I search for a student or staff member?',
    a: 'Press Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open the global search. Type a name, email, admission number, or role — results appear instantly. Click any result to jump straight to their profile.',
  },
  {
    q: 'How do teachers create assignments?',
    a: 'Navigate to Assignments in the sidebar. Click "Create Assignment", fill in the title, subject, target class, due date, and description. On submit, every student in the chosen class automatically receives a notification.',
  },
  {
    q: 'How do I borrow a library book?',
    a: 'Open the Library view. Use the search bar or category filter to find a book with available copies (shown as a green badge). Click "Borrow" — the book is added to your active loans with a due date. Return it from the same view by clicking "Return".',
  },
  {
    q: 'How do I change the theme (light/dark)?',
    a: 'Click the moon or sun icon in the top-right header. Your choice is saved locally and reapplied on your next visit. The whole app — dashboard, tables, and reports — adapts automatically.',
  },
  {
    q: 'What is the Parent Portal?',
    a: 'The Parent Portal is a summary view designed for parents and guardians. It shows the student\'s academic snapshot (subject grades + average), today\'s attendance, fee status, recent announcements, and upcoming assignments — all in one friendly, report-style layout.',
  },
  {
    q: 'How do I export student data?',
    a: 'Go to the Students view. Use the "Export" button in the toolbar to download the current filtered list as a CSV file. You can also download an empty CSV template and bulk-import new students via the import tool.',
  },
  {
    q: 'How does the discipline system work?',
    a: 'The school uses a progressive escalation policy: 3 detentions automatically escalate to 1 suspension, and 4 suspensions lead to expulsion. Staff with discipline permissions can issue detentions, warnings, or suspensions from the Discipline view. Each record includes a reason and the issuing staff member.',
  },
  {
    q: 'How do I contact the school?',
    a: 'See the Contact card below for our email, phone, and address. You can also find this information in System Settings (Branding & Contact section), which is kept up to date by the administration.',
  },
]

interface ShortcutItem { keys: string[]; action: string }

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['⌘', 'K'], action: 'Open global search' },
  { keys: ['Ctrl', 'K'], action: 'Open global search (Windows)' },
  { keys: ['Esc'], action: 'Close any open modal or dialog' },
  { keys: ['↵'], action: 'Send a chat message (in Messages)' },
  { keys: ['⇧', '↵'], action: 'New line in chat composer' },
  { keys: ['←', '→'], action: 'Navigate months in the calendar' },
]

interface GuideStep { title: string; desc: string }

const STUDENT_STEPS: GuideStep[] = [
  { title: 'Check your dashboard', desc: 'See today\'s announcements, your stats, and what\'s happening in school.' },
  { title: 'View your grades', desc: 'Open Academics & Grades to see subject scores, letter grades, and your average.' },
  { title: 'Submit assignments', desc: 'Go to Assignments, find any due work, and click Submit before the deadline.' },
  { title: 'Borrow library books', desc: 'Browse the Library, find an available title, and click Borrow.' },
  { title: 'View your Parent Portal', desc: 'Share the Parent Portal view with your guardian for a complete academic summary.' },
]

const TEACHER_STEPS: GuideStep[] = [
  { title: 'Review My Subjects', desc: 'See every class you teach and quickly jump to each class\'s grades.' },
  { title: 'Record grades', desc: 'Use Grades to enter scores per student per subject — letter grades update live.' },
  { title: 'Take attendance', desc: 'Open Attendance, pick today\'s date, and mark each student Present / Late / Absent.' },
  { title: 'Create assignments', desc: 'Post homework in Assignments — students get notified automatically.' },
  { title: 'Message students & staff', desc: 'Use Messages to chat one-on-one with any student or colleague.' },
]

const ADMIN_STEPS: GuideStep[] = [
  { title: 'Monitor the dashboard', desc: 'Track student/staff counts, fee collection, and today\'s attendance at a glance.' },
  { title: 'Manage students & staff', desc: 'Add, edit, or import records in bulk from the Students and Staff views.' },
  { title: 'Oversee discipline', desc: 'Issue detentions or suspensions and watch the escalation policy in action.' },
  { title: 'Configure the system', desc: 'Upload a logo, change the accent color, and update contact info in Settings.' },
  { title: 'Generate reports', desc: 'Print report cards, fee statements, attendance reports, and class summaries.' },
]

export function HelpView() {
  const user = useAppStore((s) => s.user)!
  const setActiveView = useAppStore((s) => s.setActiveView)
  const addToast = useAppStore((s) => s.addToast)
  const settings = useAppStore((s) => s.settings)

  const [contact, setContact] = useState<{ email: string; phone: string; address: string; name: string; tagline: string }>({
    email: 'info@educenterjm.edu',
    phone: '+1 (876) 555-0100',
    address: '123 Knowledge Way, Kingston, Jamaica',
    name: 'School Name',
    tagline: 'School Information Management System (SIMS)',
  })

  useEffect(() => {
    let active = true
    async function loadSettings() {
      if (settings?.email || settings?.phone) {
        if (active) setContact({
          email: settings.email || contact.email,
          phone: settings.phone || contact.phone,
          address: settings.address || contact.address,
          name: settings.name || contact.name,
          tagline: settings.tagline || contact.tagline,
        })
        return
      }
      try {
        const res = await api<{ settings: SchoolSettings | SchoolSettings[] }>('/api/settings')
        if (!active) return
        const s = Array.isArray(res.settings) ? res.settings[0] : res.settings
        if (s) {
          setContact({
            email: s.email || contact.email,
            phone: s.phone || contact.phone,
            address: s.address || contact.address,
            name: s.name || contact.name,
            tagline: s.tagline || contact.tagline,
          })
        }
      } catch {
        // keep defaults
      }
    }
    loadSettings()
    return () => { active = false }
  }, [settings])

  const role = user.role
  const steps = role === 'Student' ? STUDENT_STEPS : role === 'Teacher' ? TEACHER_STEPS : ADMIN_STEPS
  const roleLabel = role === 'Student' ? 'Student' : role === 'Teacher' ? 'Teacher' : 'Administrator'
  const roleIcon = role === 'Student' ? GraduationCap : role === 'Teacher' ? BookOpen : ShieldAlert

  function navigate(view: ViewId) {
    setActiveView(view)
    addToast({ type: 'info', title: 'Navigated', body: `Opened ${view} view.` })
  }

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-foreground" />
            <div>
              <p className="text-sm font-medium text-brand-foreground/90">Help Center &amp; Onboarding</p>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:text-3xl">Welcome to {contact.name}, {user.name.split(' ')[0]}!</h2>
              <p className="mt-2 max-w-2xl text-sm text-brand-foreground/85">
                {contact.name} is a complete school management platform — grades, attendance, fees, library,
                messaging, assignments, and more, all in one place. This guide will help you get the most out of it.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate('dashboard')} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Home className="h-4 w-4" /> Go to Dashboard
            </Button>
            <Button onClick={() => navigate('profile')} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Compass className="h-4 w-4" /> My Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Getting started callout + role guide */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Getting Started as a {roleLabel}
            </CardTitle>
            <CardDescription>Five quick wins to get you up and running in minutes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-brand/25 bg-brand/5 dark:border-brand/40 dark:bg-brand/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {(() => { const Icon = roleIcon; return <Icon className="h-4 w-4 text-brand" /> })()}
              Your Role
            </CardTitle>
            <CardDescription>What you can do here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Signed in as</span>
              <Badge className="bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand">{role}</Badge>
            </div>
            <Separator />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {role === 'Student' && 'You can view your grades, attendance, fees, and assignments; borrow books; message staff; and download your own report cards.'}
              {role === 'Teacher' && 'You can record grades and attendance for your classes, create assignments, message students and staff, and view student profiles.'}
              {role === 'Admin' && 'You have full access: manage students & staff, configure the system, oversee discipline, import data, and generate any report.'}
              {role === 'Principal' && 'You have full oversight access: monitor school-wide stats, manage staff, oversee discipline, and generate reports.'}
              {role === 'Vice Principal' && 'You can manage students, oversee discipline, and monitor school operations.'}
              {role === 'Nurse' && 'You can view student records and manage health-related information.'}
              {role === 'Ancillary Staff' && 'You can view student records and assist with day-to-day operations.'}
            </p>
            <Button onClick={() => navigate('profile')} variant="outline" size="sm" className="w-full border-brand/35 text-brand-strong hover:bg-brand/5 dark:border-brand/40 dark:text-brand dark:hover:bg-brand/12">
              View My Profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature overview grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-brand" /> Explore Features
          </CardTitle>
          <CardDescription>Jump straight to any part of the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURE_LINKS.map((f) => {
              const Icon = f.icon
              return (
                <button
                  key={f.view}
                  onClick={() => navigate(f.view)}
                  className="group flex items-center gap-3 rounded-lg border border-border p-3 text-left transition hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-md"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-110', colorMap[f.color])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* FAQ */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-brand" /> Frequently Asked Questions
            </CardTitle>
            <CardDescription>Answers to the questions we hear most often.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    <span className="flex items-start gap-2 text-left">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand-strong dark:bg-brand/15 dark:text-brand">{i + 1}</span>
                      {faq.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-7 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Right column: shortcuts + contact */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Keyboard className="h-4 w-4 text-brand" /> Keyboard Shortcuts
              </CardTitle>
              <CardDescription>Power-user moves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{s.action}</span>
                  <div className="flex shrink-0 gap-1">
                    {s.keys.map((k, j) => (
                      <kbd key={j} className="inline-flex min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-brand" /> Contact the School
              </CardTitle>
              <CardDescription>We're here to help</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactRow icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
              <ContactRow icon={Phone} label="Phone" value={contact.phone} href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} />
              <ContactRow icon={MapPin} label="Address" value={contact.address} />
              <Separator />
              <div className="flex items-center gap-2 rounded-md bg-brand/5 p-3 dark:bg-brand/10">
                <Award className="h-5 w-5 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-brand-strong dark:text-brand">{contact.name}</p>
                  <p className="text-xs text-brand/80 dark:text-brand/80">{contact.tagline}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer note */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-between gap-3 p-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Still need help?</p>
              <p className="text-xs text-muted-foreground">Visit the school office or reach out via the contact details above.</p>
            </div>
          </div>
          <Button onClick={() => navigate('settings')} variant="outline" size="sm">
            <Settings className="h-4 w-4" /> System Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value, href }: { icon: any; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
  if (href) {
    return <a href={href} className="block rounded-md transition hover:bg-muted/50">{content}</a>
  }
  return content
}
