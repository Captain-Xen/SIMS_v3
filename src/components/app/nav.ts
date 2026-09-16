import type { ViewId } from '@/lib/types'
import { isFeatureEnabled } from '@/lib/features'
import {
  LayoutDashboard, UserCircle, BookOpen, UserPlus, Users, BadgeCheck,
  ClipboardList, CalendarClock, DollarSign, Megaphone, Gavel,
  Mail, ClipboardCheck, Bell, Upload, Settings, Library, CalendarDays, HeartHandshake,
  FileText, HelpCircle, BarChart3, GraduationCap, HeartPulse, Bus, UtensilsCrossed, GraduationCap as AlumniIcon,
  UserCheck, PackageOpen, DoorOpen, ClipboardPaste, CalendarRange, Star, Wallet, CalendarClock as ConfIcon,
  Trophy, Shirt,
} from 'lucide-react'

export interface NavItem {
  id: ViewId
  label: string
  icon: typeof LayoutDashboard
  roles: string[] // empty = all
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { id: 'profile', label: 'My Profile', icon: UserCircle, roles: [] },
  { id: 'subjects', label: 'My Subjects', icon: BookOpen, roles: ['Teacher'] },
  { id: 'add', label: 'Add Record', icon: UserPlus, roles: ['Admin', 'Principal'] },
  { id: 'students', label: 'Students', icon: Users, roles: ['Admin', 'Principal', 'Vice Principal', 'Teacher', 'Nurse'] },
  { id: 'staff', label: 'Staff Management', icon: BadgeCheck, roles: ['Admin', 'Principal'] },
  { id: 'grades', label: 'Academics & Grades', icon: ClipboardList, roles: ['Teacher', 'Admin', 'Student'] },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['Teacher', 'Admin', 'Student'] },
  { id: 'timetable', label: 'Timetable', icon: CalendarClock, roles: ['Student', 'Teacher'] },
  { id: 'fees', label: 'Fee Management', icon: DollarSign, roles: ['Admin', 'Student'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['Admin', 'Principal', 'Student', 'Teacher'] },
  { id: 'discipline', label: 'Discipline', icon: Gavel, roles: ['Principal', 'Vice Principal', 'Admin'] },
  { id: 'messages', label: 'Messages', icon: Mail, roles: [] },
  { id: 'assignments', label: 'Assignments', icon: ClipboardCheck, roles: ['Teacher', 'Student'] },
  { id: 'library', label: 'Library', icon: Library, roles: [] },
  { id: 'events', label: 'Events Calendar', icon: CalendarDays, roles: [] },
  { id: 'parent-portal', label: 'Parent Portal', icon: HeartHandshake, roles: ['Student'] },
  { id: 'reports', label: 'Reports', icon: FileText, roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'exams', label: 'Exams', icon: GraduationCap, roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'health', label: 'Health Records', icon: HeartPulse, roles: ['Nurse', 'Admin', 'Principal'] },
  { id: 'transport', label: 'Transportation', icon: Bus, roles: ['Admin', 'Principal', 'Student'] },
  { id: 'cafeteria', label: 'Cafeteria', icon: UtensilsCrossed, roles: ['Admin', 'Principal', 'Student'] },
  { id: 'alumni', label: 'Alumni', icon: AlumniIcon, roles: ['Admin', 'Principal'] },
  { id: 'visitors', label: 'Visitors', icon: UserCheck, roles: ['Admin', 'Principal', 'Ancillary Staff'] },
  { id: 'inventory', label: 'Inventory', icon: PackageOpen, roles: ['Admin', 'Principal'] },
  { id: 'facilities', label: 'Facilities', icon: DoorOpen, roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'admissions', label: 'Admissions', icon: ClipboardPaste, roles: ['Admin', 'Principal'] },
  { id: 'terms', label: 'Terms & Calendar', icon: CalendarRange, roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'performance', label: 'Performance', icon: Star, roles: ['Admin', 'Principal', 'Teacher'] },
  { id: 'finance', label: 'Finance', icon: Wallet, roles: ['Admin', 'Principal'] },
  { id: 'conference', label: 'Conferences', icon: ConfIcon, roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'activities', label: 'Activities', icon: Trophy, roles: ['Admin', 'Principal', 'Teacher', 'Student'] },
  { id: 'uniform', label: 'Uniform', icon: Shirt, roles: ['Admin', 'Principal', 'Student'] },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: [] },
  { id: 'import', label: 'Bulk Import', icon: Upload, roles: ['Admin'] },
  { id: 'settings', label: 'System Settings', icon: Settings, roles: ['Admin'] },
  { id: 'help', label: 'Help & FAQ', icon: HelpCircle, roles: [] },
]

export function navForRole(role: string, features?: Record<string, boolean>): NavItem[] {
  return NAV.filter((n) =>
    (n.roles.length === 0 || n.roles.includes(role)) && isFeatureEnabled(features, n.id))
}

// Core modules every role always keeps — hiding these could lock users out.
const ALWAYS_ON: ViewId[] = ['dashboard', 'profile', 'settings', 'help', 'notifications']

/** Modules the admin may hide/unhide globally via Settings → Feature Visibility. */
export const HIDEABLE_FEATURES: NavItem[] = NAV.filter((n) => !ALWAYS_ON.includes(n.id))

export function isHideable(id: ViewId): boolean {
  return !ALWAYS_ON.includes(id)
}

export const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  subjects: 'My Subjects',
  add: 'Add Record',
  students: 'Students',
  staff: 'Staff Management',
  grades: 'Academics & Grades',
  attendance: 'Attendance',
  timetable: 'Timetable',
  fees: 'Fee Management',
  announcements: 'Announcements',
  discipline: 'Discipline Module',
  messages: 'Messages',
  assignments: 'Assignments',
  notifications: 'Notifications',
  library: 'Library',
  events: 'Events Calendar',
  'parent-portal': 'Parent Portal',
  reports: 'Reports & Transcripts',
  analytics: 'School Analytics',
  exams: 'Exam Management',
  health: 'Health Records',
  transport: 'Transportation',
  cafeteria: 'Cafeteria',
  alumni: 'Alumni',
  visitors: 'Visitor Management',
  inventory: 'Inventory',
  facilities: 'Facilities Booking',
  admissions: 'Admissions',
  terms: 'Terms & Calendar',
  performance: 'Staff Performance',
  finance: 'School Finance',
  conference: 'Parent-Teacher Conferences',
  activities: 'School Activities',
  uniform: 'Uniform Management',
  import: 'Bulk Import',
  settings: 'System Settings',
  help: 'Help & FAQ',
}
