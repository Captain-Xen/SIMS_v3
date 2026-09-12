import { create } from 'zustand'
import type { SessionUser, ViewId, SchoolSettings } from './types'

export interface Toast {
  id: string
  title: string
  body?: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface AppState {
  user: SessionUser | null
  setUser: (u: SessionUser | null) => void

  activeView: ViewId
  setActiveView: (v: ViewId) => void

  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  toggleTheme: () => void

  settings: SchoolSettings | null
  setSettings: (s: SchoolSettings | null) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  searchOpen: boolean
  setSearchOpen: (b: boolean) => void

  toasts: Toast[]
  addToast: (t: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // unread notification badge (shared between AppShell poll + NotificationsView)
  unreadCount: number
  setUnreadCount: (n: number) => void

  // viewed student/staff (for profile drilldown)
  viewUserId: string | null
  setViewUserId: (id: string | null) => void
}

const initialTheme: 'light' | 'dark' =
  (typeof window !== 'undefined' && localStorage.getItem('edu-theme') === 'dark') ? 'dark' : 'light'

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (u) => set({ user: u }),

  activeView: 'dashboard',
  setActiveView: (v) => set({ activeView: v }),

  theme: initialTheme,
  setTheme: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem('edu-theme', t)
    set({ theme: t })
    applyTheme(t)
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  settings: null,
  setSettings: (s) => set({ settings: s }),

  sidebarCollapsed: typeof window !== 'undefined' && localStorage.getItem('edu-sidebar') === 'true',
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed
    if (typeof window !== 'undefined') localStorage.setItem('edu-sidebar', String(next))
    set({ sidebarCollapsed: next })
  },

  searchOpen: false,
  setSearchOpen: (b) => set({ searchOpen: b }),

  toasts: [],
  addToast: (t) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().removeToast(id), 4200)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),

  viewUserId: null,
  setViewUserId: (id) => set({ viewUserId: id }),
}))

export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
