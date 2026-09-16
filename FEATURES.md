# EduCenterJM — Feature List

Every feature below is live in the application. Role restrictions are shown where they apply — **Admin, Principal, Vice Principal, Teacher, Nurse, Ancillary Staff, Student**.

> Admins can **hide/show entire modules** for every role at once (System Settings → Feature Visibility); hidden modules disappear from everyone's navigation on the fly. Core modules (Dashboard, Profile, Notifications, Help, Settings) always stay on.

---

## Accounts & Access
- Secure login with cookie sessions; separate portals for **Staff** and **Students**
- Self-service **user registration** (new staff/student accounts)
- 7 role types with role-based navigation and view permissions
- Automatic idle-timeout with warning countdown (security on shared computers)
- One-click logout with confirmation dialog

## Dashboard (all roles)
- Role-aware overview: live counts (students, staff, fees collected, attendance %)
- Grade-distribution chart and today's attendance donut
- Today's schedule, announcements feed, and quick actions
- Welcome banner with school branding and date

## People Management
- **Students** — searchable/filterable roster; add, edit, view profile, suspend/terminate/expel *(Admin, Principal, Vice Principal, Teacher, Nurse)*
- **Staff Management** — staff directory and records *(Admin, Principal)*
- **Admissions** — applicant pipeline (Pending → Reviewing → Accepted/Rejected → Enrolled) *(Admin, Principal)*
- **Alumni** — graduate registry *(Admin, Principal)*
- **Visitors** — check-in/check-out log with gate passes *(Admin, Principal, Ancillary Staff)*

## Academics
- **Academics & Grades** — record/edit scores per subject & term; student view is read-only *(Teacher, Admin, Student)*
- **Exam Management** — schedule exams with room, duration, total/passing marks *(Admin, Principal, Teacher, Student)*
- **Attendance** — daily Present/Absent/Late/Excused register *(Teacher, Admin, Student)*
- **Timetable** — weekly class schedule grid *(Student, Teacher)*
- **My Subjects** — a teacher's own classes *(Teacher)*
- **Assignments** — teachers create assignments; students submit; teachers grade with feedback *(Teacher, Student)*
- **Reports & Transcripts** — report cards and printable/PDF transcripts *(Admin, Principal, Teacher, Student)*
- **Staff Performance** — structured review periods with multi-category ratings *(Admin, Principal, Teacher)*

## Communication
- **Messages** — internal direct messaging between any users with conversation list and unread badges
- **Announcements** — school-wide posts *(Admin, Principal; read: Student, Teacher)*
- **Notifications Center** — in-app notification feed with unread badge (email-ready)
- **Parent-Teacher Conferences** — teachers publish slots; parents book them *(Admin, Principal, Teacher, Student)*
- **Parent Portal** — guardian-facing summary for their child *(Student role)*

## Operations
- **Library** — book catalogue, borrow/return with due dates and overdue tracking
- **Transportation** — bus routes, drivers, stops, and student route assignments *(Admin, Principal, Student)*
- **Cafeteria** — meal accounts, top-ups, purchases, and meal plans *(Admin, Principal, Student)*
- **Uniform Management** — uniform items, stock, pricing, and issuance records *(Admin, Principal, Student)*
- **Inventory** — school assets with quantity, condition, location, low-stock alerts *(Admin, Principal)*
- **Facilities Booking** — bookable rooms/labs/halls with approval workflow *(Admin, Principal, Teacher)*
- **Events Calendar** — school calendar with exams, holidays, meetings; event creation
- **Activities** — sports/science/cultural/charity activities with participant sign-up *(Admin, Principal, Teacher, Student)*
- **Health Records** — allergies, conditions, medication, clinic visits with severity *(Nurse, Admin, Principal)*

## Finance
- **Fee Management** — student fee records, paid/pending status, collection stats *(Admin, Student)*
- **School Finance** — budget categories with allocated vs. actual expense tracking *(Admin, Principal)*

## Administration
- **Discipline Module** — incident logging (warning/detention/suspension) and escalation *(Principal, Vice Principal, Admin)*
- **Terms & Calendar** — academic terms, active term, holidays and exam weeks *(Admin, Principal, Teacher)*
- **Analytics** — attendance, gender split, fees, and grade-band charts *(Admin, Principal, Teacher)*
- **Bulk Import** — CSV import of students/staff *(Admin)*
- **Add Record** — quick-create for any record type *(Admin, Principal)*
- **System Settings** *(Admin)*:
  - School branding — name, tagline, logo upload
  - **Color Scheme** — 16 accent themes applied live across the whole app (charts included)
  - **Feature Visibility** — hide/unhide any module for every role, live
  - School contact info (email, phone, address)
  - Danger zone — reset/reseed demo data

## Profile & Gamification
- Personal profile page with **avatar upload** (falls back to a default user icon)
- Editable bio, phone, and personal details
- Points, levels, and badges earned through activity

## Platform & UX
- **Live global settings sync** — when an admin changes the theme or hides a feature, every signed-in user (student/teacher/staff) picks it up automatically within seconds — no reload needed
- **⌘K / Ctrl+K quick search** across students and staff
- **Dark / light mode** toggle, remembered per browser
- Fully **responsive** — dedicated mobile navigation and layouts
- Toast notifications for every action; loading skeletons; keyboard accessible
- Resource-light by design: lazy-loaded views, tiny polling payloads, cached hot endpoints
