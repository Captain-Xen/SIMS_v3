'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  GraduationCap, Menu, Search, Moon, Sun, Bell, LogOut, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeft, Loader2, Github,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { navForRole, VIEW_TITLES } from './nav'
import { UserAvatar } from './user-avatar'
import { SearchModal } from './search-modal'
import { ToastContainer } from './toast-container'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Resource optimization: every view is code-split via next/dynamic. Chunks are
// fetched on first visit only, keeping the initial bundle (and browser memory)
// minimal. Recharts, forms, etc. only load for the views that need them.
// ---------------------------------------------------------------------------
function ViewLoader() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading view">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

const viewOpts = { loading: ViewLoader }
const DashboardView = dynamic(() => import('./views/dashboard').then((m) => m.DashboardView), { loading: ViewLoader })
const ProfileView = dynamic(() => import('./views/profile').then((m) => m.ProfileView), { loading: ViewLoader })
const StudentsView = dynamic(() => import('./views/students').then((m) => m.StudentsView), { loading: ViewLoader })
const StaffView = dynamic(() => import('./views/staff').then((m) => m.StaffView), { loading: ViewLoader })
const GradesView = dynamic(() => import('./views/grades').then((m) => m.GradesView), { loading: ViewLoader })
const AttendanceView = dynamic(() => import('./views/attendance').then((m) => m.AttendanceView), { loading: ViewLoader })
const TimetableView = dynamic(() => import('./views/timetable').then((m) => m.TimetableView), { loading: ViewLoader })
const FeesView = dynamic(() => import('./views/fees').then((m) => m.FeesView), { loading: ViewLoader })
const AnnouncementsView = dynamic(() => import('./views/announcements').then((m) => m.AnnouncementsView), { loading: ViewLoader })
const DisciplineView = dynamic(() => import('./views/discipline').then((m) => m.DisciplineView), { loading: ViewLoader })
const MessagesView = dynamic(() => import('./views/messages').then((m) => m.MessagesView), { loading: ViewLoader })
const AssignmentsView = dynamic(() => import('./views/assignments').then((m) => m.AssignmentsView), { loading: ViewLoader })
const NotificationsView = dynamic(() => import('./views/notifications').then((m) => m.NotificationsView), { loading: ViewLoader })
const ImportView = dynamic(() => import('./views/import').then((m) => m.ImportView), { loading: ViewLoader })
const SettingsView = dynamic(() => import('./views/settings').then((m) => m.SettingsView), { loading: ViewLoader })
const SubjectsView = dynamic(() => import('./views/subjects').then((m) => m.SubjectsView), { loading: ViewLoader })
const AddRecordView = dynamic(() => import('./views/add-record').then((m) => m.AddRecordView), { loading: ViewLoader })
const LibraryView = dynamic(() => import('./views/library').then((m) => m.LibraryView), { loading: ViewLoader })
const EventsView = dynamic(() => import('./views/events').then((m) => m.EventsView), { loading: ViewLoader })
const ParentPortalView = dynamic(() => import('./views/parent-portal').then((m) => m.ParentPortalView), { loading: ViewLoader })
const ReportsView = dynamic(() => import('./views/reports').then((m) => m.ReportsView), { loading: ViewLoader })
const HelpView = dynamic(() => import('./views/help').then((m) => m.HelpView), { loading: ViewLoader })
const AnalyticsView = dynamic(() => import('./views/analytics').then((m) => m.AnalyticsView), { loading: ViewLoader })
const ExamsView = dynamic(() => import('./views/exams').then((m) => m.ExamsView), { loading: ViewLoader })
const HealthView = dynamic(() => import('./views/health').then((m) => m.HealthView), { loading: ViewLoader })
const TransportView = dynamic(() => import('./views/transport').then((m) => m.TransportView), { loading: ViewLoader })
const CafeteriaView = dynamic(() => import('./views/cafeteria').then((m) => m.CafeteriaView), { loading: ViewLoader })
const AlumniView = dynamic(() => import('./views/alumni').then((m) => m.AlumniView), { loading: ViewLoader })
const VisitorsView = dynamic(() => import('./views/visitors').then((m) => m.VisitorsView), { loading: ViewLoader })
const InventoryView = dynamic(() => import('./views/inventory').then((m) => m.InventoryView), { loading: ViewLoader })
const FacilitiesView = dynamic(() => import('./views/facilities').then((m) => m.FacilitiesView), { loading: ViewLoader })
const AdmissionsView = dynamic(() => import('./views/admissions').then((m) => m.AdmissionsView), { loading: ViewLoader })
const TermsView = dynamic(() => import('./views/terms').then((m) => m.TermsView), { loading: ViewLoader })
const PerformanceView = dynamic(() => import('./views/performance').then((m) => m.PerformanceView), { loading: ViewLoader })
const FinanceView = dynamic(() => import('./views/finance').then((m) => m.FinanceView), { loading: ViewLoader })
const ConferenceView = dynamic(() => import('./views/conference').then((m) => m.ConferenceView), { loading: ViewLoader })
const ActivitiesView = dynamic(() => import('./views/activities').then((m) => m.ActivitiesView), { loading: ViewLoader })
const UniformView = dynamic(() => import('./views/uniform').then((m) => m.UniformView), { loading: ViewLoader })
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const IDLE_LIMIT = 7 * 60 * 1000 // 7 minutes
const WARNING_DURATION = 60 // seconds

export function AppShell() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const settings = useAppStore((s) => s.settings)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)
  const addToast = useAppStore((s) => s.addToast)
  const unreadCount = useAppStore((s) => s.unreadCount)
  const setUnreadCount = useAppStore((s) => s.setUnreadCount)

  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [idleWarning, setIdleWarning] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState(WARNING_DURATION)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivity = useRef(0)

  // Feature-visibility-aware navigation: role filter + admin's global hide/unhide.
  const nav = useMemo(
    () => (user ? navForRole(user.role, settings?.features) : []),
    [user, settings?.features],
  )

  // If the admin hides the module a user is currently viewing, bounce to Dashboard.
  useEffect(() => {
    if (!user || nav.length === 0) return
    if (!nav.some((n) => n.id === activeView)) setActiveView('dashboard')
  }, [nav, activeView, user, setActiveView])

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  // Idle timeout
  useEffect(() => {
    if (!user) return
    const reset = () => {
      // Throttle: high-frequency events (mousemove/scroll) would otherwise
      // clear+rearm a timeout on every pixel of movement.
      const now = Date.now()
      if (now - lastActivity.current < 5000) return
      lastActivity.current = now
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setIdleWarning(true), IDLE_LIMIT)
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, reset))
    reset()
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [user])

  useEffect(() => {
    if (!idleWarning) return
    setIdleCountdown(WARNING_DURATION)
    countdownTimer.current = setInterval(() => {
      setIdleCountdown((c) => {
        if (c <= 1) {
          if (countdownTimer.current) clearInterval(countdownTimer.current)
          doLogout(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { if (countdownTimer.current) clearInterval(countdownTimer.current) }
  }, [idleWarning])

  // Unread badge poll — uses a lightweight COUNT endpoint, runs every 60s and
  // pauses entirely while the tab is hidden (zero network when not looking).
  useEffect(() => {
    if (!user) return
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null
    async function load() {
      try {
        const res = await api<{ count: number }>('/api/notifications', { query: { mode: 'count' } })
        if (active) setUnreadCount(res.count)
      } catch { /* ignore */ }
    }
    function start() {
      if (timer) return
      load()
      timer = setInterval(load, 60000)
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null }
    }
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [user, setUnreadCount])

  async function doLogout(auto = false) {
    setLoggingOut(true)
    try {
      await api('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setActiveView('dashboard') // reset view so the next sign-in starts clean
      setUnreadCount(0)
      addToast({ type: auto ? 'warning' : 'info', title: auto ? 'Logged out (idle)' : 'Signed out', body: auto ? 'You were inactive for too long.' : 'See you soon!' })
    } catch {
      setUser(null)
    } finally {
      setLoggingOut(false)
      setLogoutOpen(false)
      setIdleWarning(false)
    }
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard': return <DashboardView />
      case 'profile': return <ProfileView />
      case 'subjects': return <SubjectsView />
      case 'add': return <AddRecordView />
      case 'students': return <StudentsView />
      case 'staff': return <StaffView />
      case 'grades': return <GradesView />
      case 'attendance': return <AttendanceView />
      case 'timetable': return <TimetableView />
      case 'fees': return <FeesView />
      case 'announcements': return <AnnouncementsView />
      case 'discipline': return <DisciplineView />
      case 'messages': return <MessagesView />
      case 'assignments': return <AssignmentsView />
      case 'notifications': return <NotificationsView />
      case 'library': return <LibraryView />
      case 'events': return <EventsView />
      case 'parent-portal': return <ParentPortalView />
      case 'reports': return <ReportsView />
      case 'analytics': return <AnalyticsView />
      case 'exams': return <ExamsView />
      case 'health': return <HealthView />
      case 'transport': return <TransportView />
      case 'cafeteria': return <CafeteriaView />
      case 'alumni': return <AlumniView />
      case 'visitors': return <VisitorsView />
      case 'inventory': return <InventoryView />
      case 'facilities': return <FacilitiesView />
      case 'admissions': return <AdmissionsView />
      case 'terms': return <TermsView />
      case 'performance': return <PerformanceView />
      case 'finance': return <FinanceView />
      case 'conference': return <ConferenceView />
      case 'activities': return <ActivitiesView />
      case 'uniform': return <UniformView />
      case 'help': return <HelpView />
      case 'import': return <ImportView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  if (!user) return null

  function handleNavClick(v: typeof activeView) {
    setActiveView(v)
    setMobileNavOpen(false)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex',
            sidebarCollapsed ? 'w-20' : 'w-64'
          )}
        >
          {/* Logo */}
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4 hover:bg-sidebar-accent/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-md">
              {settings?.logo ? <img src={settings.logo} alt="School" className="h-full w-full object-cover" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 text-left">
                {/* School name is admin-configurable (Settings → Branding) and live-syncs everywhere. */}
                <p className="truncate font-school text-[15px] font-bold leading-tight tracking-tight">{settings?.name || 'School Name'}</p>
                <div className="flex items-center gap-1">
                  <p className="truncate text-[10px] text-muted-foreground">{user.role} Portal</p>
                  {user.accountType === 'demo' && (
                    <span
                      title="Demo account — you are previewing sample data, not the school's real system"
                      className="shrink-0 rounded bg-amber-500/15 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
                    >
                      Demo
                    </span>
                  )}
                </div>
              </div>
            )}
          </button>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {nav.map((item) => {
              const Icon = item.icon
              const active = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active ? 'bg-brand text-brand-foreground shadow-md shadow-brand/25' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  {active && !sidebarCollapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/80" />
                  )}
                  <Icon className={cn('h-5 w-5 shrink-0 transition-transform', active ? 'scale-110' : 'group-hover:scale-105')} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {item.id === 'notifications' && unreadCount > 0 && !sidebarCollapsed && (
                    <Badge className="ml-auto bg-red-500 px-1.5 py-0 text-[10px] text-white ring-2 ring-brand/50">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                  )}
                  {item.id === 'notifications' && unreadCount > 0 && sidebarCollapsed && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer of sidebar */}
          <div className="space-y-1 border-t border-sidebar-border p-3">
            <button
              onClick={() => setLogoutOpen(true)}
              className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30', sidebarCollapsed && 'justify-center')}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-1.5 border-b border-border bg-card/80 px-3 backdrop-blur sm:gap-2 sm:px-4 lg:px-6">
            <button onClick={() => setMobileNavOpen(true)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={toggleSidebar} className="hidden shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:flex" aria-label="Toggle sidebar">
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <h1 className="min-w-0 truncate font-serif text-base font-semibold sm:text-lg md:text-xl">{VIEW_TITLES[activeView]}</h1>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted sm:px-3"
              >
                <Search className="h-4 w-4" />
                <span className="hidden lg:inline">Search...</span>
                <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] lg:inline">⌘K</kbd>
              </button>

              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <button
                onClick={() => setActiveView('notifications')}
                className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="mx-0.5 h-6 w-px bg-border sm:mx-1" />

              {user.accountType === 'demo' && (
                <span
                  title="Demo account — you are previewing sample data, not the school's real system"
                  className="hidden items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 md:inline-flex"
                >
                  Demo Account
                </span>
              )}

              <button onClick={() => setActiveView('profile')} className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-muted">
                <UserAvatar name={user.name} avatar={user.avatar} role={user.role} size="sm" />
                <div className="hidden text-left sm:block">
                  <p className="max-w-[100px] truncate text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user.role}</p>
                </div>
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
            <div key={activeView} className="animate-fade-slide">
              {renderView()}
            </div>
          </main>
        </div>
      </div>

      {/* Sticky footer — always at viewport bottom (content scrolls above) */}
      <footer className="relative z-10 shrink-0 border-t border-border bg-card/95 px-4 py-2 text-xs text-foreground/60 backdrop-blur lg:px-6">
        <div className="flex flex-col items-center justify-center gap-0.5 text-center leading-snug">
          <p>© 2026 Xen LabsJM. All Rights Reserved. Free Digital Tools for Education</p>
          <p className="flex items-center gap-1">
            <span>Developed by Xen</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://github.com/Captain-Xen"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground/70 underline-offset-2 transition-colors hover:text-brand hover:underline"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              GitHub
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="h-16 flex flex-row items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-md">
              {settings?.logo ? <img src={settings.logo} alt="School" className="h-full w-full object-cover" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            <SheetTitle className="min-w-0 truncate font-school text-base font-bold">{settings?.name || 'School Name'}</SheetTitle>
            {user.accountType === 'demo' && (
              <span
                title="Demo account — you are previewing sample data, not the school's real system"
                className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
              >
                Demo
              </span>
            )}
          </SheetHeader>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {nav.map((item) => {
              const Icon = item.icon
              const active = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-brand text-brand-foreground shadow-sm shadow-brand/20' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <Badge className="ml-auto bg-red-500 px-1.5 py-0 text-[10px] text-white">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
                  )}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            <button
              onClick={() => { setMobileNavOpen(false); setLogoutOpen(true) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <SearchModal />
      <ToastContainer />

      {/* Logout confirm */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You will be returned to the login screen. You can sign back in any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doLogout(false)}
              disabled={loggingOut}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loggingOut ? 'Signing out...' : 'Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Idle warning */}
      <AlertDialog open={idleWarning} onOpenChange={(o) => { if (!o) { setIdleWarning(false); if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setIdleWarning(true), IDLE_LIMIT) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Still there?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve been inactive. You&apos;ll be automatically signed out in <span className="font-bold text-amber-600">{idleCountdown}</span> seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => { setIdleWarning(false); if (idleTimer.current) clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setIdleWarning(true), IDLE_LIMIT) }} className="bg-brand text-brand-foreground hover:bg-brand-strong">
              Stay logged in
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
