// Shared types for EduCenterJM

export type Role =
  | 'Admin'
  | 'Principal'
  | 'Vice Principal'
  | 'Teacher'
  | 'Nurse'
  | 'Ancillary Staff'
  | 'Student'

export type ViewId =
  | 'dashboard'
  | 'profile'
  | 'subjects'
  | 'add'
  | 'students'
  | 'staff'
  | 'grades'
  | 'attendance'
  | 'timetable'
  | 'fees'
  | 'announcements'
  | 'discipline'
  | 'messages'
  | 'assignments'
  | 'notifications'
  | 'library'
  | 'events'
  | 'parent-portal'
  | 'reports'
  | 'analytics'
  | 'exams'
  | 'health'
  | 'transport'
  | 'cafeteria'
  | 'alumni'
  | 'visitors'
  | 'inventory'
  | 'facilities'
  | 'admissions'
  | 'terms'
  | 'performance'
  | 'finance'
  | 'conference'
  | 'activities'
  | 'uniform'
  | 'help'
  | 'import'
  | 'settings'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  avatar: string | null
  bio: string | null
  phone: string | null
  grade: number | null
  className: string | null
  department: string | null
  subjects: string | null
  points: number
  level: number
  badges: number
}

export interface Student {
  id: string
  name: string
  email: string
  dob: string | null
  gender: string | null
  bloodGroup: string | null
  admissionNo: string | null
  grade: number | null
  className: string | null
  guardian: string | null
  phone: string | null
  status: string
  avatar: string | null
  feeStatus: string
  detentions: number
  suspensions: number
}

export interface Staff {
  id: string
  name: string
  email: string
  role: string
  status: string
  department: string | null
  subjects: string | null
  avatar: string | null
  phone: string | null
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorName: string
  authorRole: string
  createdAt: string
}

export interface Grade {
  id: string
  studentId: string
  studentName: string
  teacherId: string | null
  subject: string
  score: number
  term: string
  createdAt: string
}

export interface Attendance {
  id: string
  studentId: string
  studentName: string
  date: string
  status: string
}

export interface Fee {
  id: string
  studentId: string
  studentName: string
  amount: number
  status: string
  dueDate: string
  term: string
}

export interface Discipline {
  id: string
  studentId: string
  studentName: string
  type: string
  reason: string
  date: string
  issuerName: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: string
  description: string | null
}

export interface Message {
  id: string
  fromId: string
  fromName: string
  fromRole: string
  toId: string
  toName: string
  toRole: string
  body: string
  read: boolean
  createdAt: string
}

export interface Assignment {
  id: string
  teacherId: string
  teacherName: string
  title: string
  description: string
  subject: string
  className: string
  dueDate: string
  createdAt: string
  submissionStatus?: string | null
  submissionGrade?: number | null
}

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

export interface SchoolSettings {
  name: string
  tagline: string
  logo: string | null
  accent: string
  email: string
  phone: string
  address: string
  /** Admin-controlled module visibility map (viewId -> enabled). Missing key = enabled. */
  features: Record<string, boolean>
  /** Bumped on every settings PATCH — clients poll this to live-sync theme + features. */
  version: number
}

export interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  category: string
  copies: number
  available: number
  shelf: string | null
}

export interface Loan {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor: string
  userId: string
  userName: string
  borrowDate: string
  dueDate: string
  returnDate: string | null
  status: string
}

export interface Exam {
  id: string
  title: string
  subject: string
  className: string
  date: string
  startTime: string
  duration: number
  room: string | null
  totalMarks: number
  passingMarks: number
  notes: string | null
  createdByName: string | null
  createdAt: string
}

export interface HealthRecord {
  id: string
  studentId: string
  studentName: string
  type: string
  title: string
  description: string | null
  severity: string
  date: string | null
  recordedByName: string | null
  createdAt: string
}

export interface BusRoute {
  id: string
  routeName: string
  driverName: string
  driverPhone: string | null
  vehicleNo: string | null
  capacity: number
  morningPickup: string | null
  eveningDrop: string | null
  stops: string[]
  assignedCount: number
}

export interface BusAssignment {
  id: string
  routeId: string
  routeName: string
  studentId: string
  studentName: string
  studentClass: string | null
  createdAt: string
}

export interface MealAccount {
  id: string
  userId: string
  userName: string
  balance: number
  dietaryTags: string[]
  mealPlan: string
  updatedAt: string
}

export interface MealTransaction {
  id: string
  accountId: string
  type: string
  amount: number
  description: string
  date: string
  createdAt: string
}

export interface Alumni {
  id: string
  name: string
  email: string
  admissionNo: string | null
  gradYear: number
  lastGrade: number
  lastClass: string | null
  avatar: string | null
  bio: string | null
  phone: string | null
  status: string
}

export interface Visitor {
  id: string
  name: string
  phone: string | null
  email: string | null
  purpose: string
  visitingWhom: string | null
  checkInTime: string
  checkOutTime: string | null
  status: string
  gatePassNo: string | null
  checkedInByName: string | null
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  condition: string
  location: string | null
  minStock: number
  notes: string | null
  updatedAt: string
}

export interface Facility {
  id: string
  name: string
  type: string
  capacity: number
  location: string | null
  isBookable: boolean
  notes: string | null
}

export interface Booking {
  id: string
  facilityId: string
  facilityName: string
  facilityType: string
  requestedById: string | null
  requestedByName: string | null
  title: string
  purpose: string
  date: string
  startTime: string
  endTime: string
  status: string
  reviewedByName: string | null
  createdAt: string
}

export interface Admission {
  id: string
  applicantName: string
  email: string
  phone: string | null
  dob: string | null
  gender: string | null
  gradeApplied: number
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
  address: string | null
  previousSchool: string | null
  status: string
  notes: string | null
  reviewedByName: string | null
  createdAt: string
}

export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  holidays: { date: string; name: string }[]
  examWeeks: { startDate: string; endDate: string; name: string }[]
}

export interface PerformanceReview {
  id: string
  subjectId: string
  subjectName: string
  subjectRole: string
  reviewerId: string
  reviewerName: string
  period: string
  rating: number
  teaching: number
  punctuality: number
  professionalism: number
  studentEngagement: number
  comments: string | null
  goals: string | null
  createdAt: string
}

export interface Budget {
  id: string
  category: string
  allocated: number
  spent: number
  period: string
}

export interface Expense {
  id: string
  budgetId: string | null
  description: string
  amount: number
  category: string
  date: string
  recordedByName: string | null
  createdAt: string
}

export interface ConferenceSlot {
  id: string
  teacherId: string
  teacherName: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  bookingStudentName: string | null
  bookingParentName: string | null
  bookingStatus: string | null
}

export interface ConferenceBooking {
  id: string
  slotId: string
  teacherName: string
  date: string
  startTime: string
  endTime: string
  parentId: string
  parentName: string
  studentName: string
  notes: string | null
  status: string
  createdAt: string
}

export interface SchoolEvent {
  id: string
  title: string
  type: string
  description: string | null
  date: string
  startTime: string | null
  endTime: string | null
  venue: string | null
  status: string
  participantCount: number
  createdAt: string
}

export interface EventParticipant {
  id: string
  eventId: string
  userId: string
  userName: string
  userRole: string
  role: string
  createdAt: string
}

export interface UniformItem {
  id: string
  name: string
  category: string
  sizes: string[]
  price: number
  stock: number
}

export interface UniformAllocation {
  id: string
  uniformId: string
  uniformName: string
  userId: string
  userName: string
  size: string
  quantity: number
  status: string
  date: string
  createdAt: string
}
