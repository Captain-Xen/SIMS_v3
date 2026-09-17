'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, Mail, ClipboardCheck,
  Loader2, BellOff,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Notification } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface TypeMeta {
  Icon: any
  color: string
  bg: string
}

const ICONS: Record<string, TypeMeta> = {
  info: { Icon: Info, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-950/50' },
  success: { Icon: CheckCircle2, color: 'text-brand dark:text-brand', bg: 'bg-brand/10 dark:bg-brand/15' },
  warning: { Icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50' },
  message: { Icon: Mail, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100 dark:bg-teal-950/50' },
  assignment: { Icon: ClipboardCheck, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/50' },
}

function metaFor(type: string): TypeMeta {
  return ICONS[type] ?? ICONS.info
}

export function NotificationsView() {
  const addToast = useAppStore((s) => s.addToast)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setUnreadCount = useAppStore((s) => s.setUnreadCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api<{ notifications: Notification[] }>('/api/notifications')
      setNotifications(res.notifications)
      setUnreadCount(res.notifications.filter((n) => !n.read).length)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load notifications', body: e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    load().then(() => { if (!active) return })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read)
    return notifications
  }, [notifications, filter])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAllRead() {
    if (unreadCount === 0) return
    setMarkingAll(true)
    try {
      await api('/api/notifications', { method: 'PATCH', body: { all: true } })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      addToast({ type: 'success', title: 'All caught up!', body: 'Marked everything as read.' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to mark all', body: e.message })
    } finally {
      setMarkingAll(false)
    }
  }

  function navigateForType(type: string) {
    if (type === 'message') setActiveView('messages')
    else if (type === 'assignment') setActiveView('assignments')
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      try {
        await api('/api/notifications', { method: 'PATCH', body: { id: n.id } })
        const next = notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        setNotifications(next)
        setUnreadCount(next.filter((x) => !x.read).length)
      } catch {
        /* still navigate below */
      }
    }
    navigateForType(n.type)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <Bell className="h-5 w-5 text-brand" /> Notifications
            {unreadCount > 0 && (
              <Badge className="ml-1 bg-brand text-brand-foreground">{unreadCount} new</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Stay on top of messages, assignments, and school updates.</p>
        </div>
        <Button variant="outline" onClick={markAllRead} disabled={markingAll || unreadCount === 0}>
          {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Mark all as read
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <BellOff className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs">
                {filter === 'unread' ? 'You\u2019re all caught up!' : 'New updates will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((n) => {
                const meta = metaFor(n.type)
                const Icon = meta.Icon
                const navigable = n.type === 'message' || n.type === 'assignment'
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'flex w-full items-start gap-3 p-4 text-left transition hover:bg-muted/40',
                      !n.read && 'bg-brand/5 dark:bg-brand/5'
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', meta.bg)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                      {navigable && (
                        <p className="mt-1 text-xs font-medium text-brand">
                          {n.type === 'message' ? 'Open Messages \u2192' : 'Open Assignments \u2192'}
                        </p>
                      )}
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {filtered.length} of {notifications.length} notifications
          {unreadCount > 0 && ` · ${unreadCount} unread`}
        </p>
      )}
    </div>
  )
}
