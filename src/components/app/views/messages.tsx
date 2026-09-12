'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MessageSquare, Send, Plus, Search, Loader2, ArrowLeft, MessagesSquare,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Message, Student, Staff } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  name: string
  role: string
  lastMessage: string
  createdAt: string
  unread: number
}

interface PartnerMeta {
  avatar: string | null
  role: string
  name: string
}

export function MessagesView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [avatarMap, setAvatarMap] = useState<Record<string, PartnerMeta>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Initial load: conversation list + user roster (for avatars)
  useEffect(() => {
    let active = true
    Promise.all([
      api<{ conversations: Conversation[] }>('/api/messages'),
      api<{ students: Student[] }>('/api/students'),
      api<{ staff: Staff[] }>('/api/staff'),
    ]).then(([cRes, sRes, stRes]) => {
      if (!active) return
      setConversations(cRes.conversations)
      const map: Record<string, PartnerMeta> = {}
      for (const s of sRes.students) map[s.id] = { avatar: s.avatar, role: 'Student', name: s.name }
      for (const st of stRes.staff) map[st.id] = { avatar: st.avatar, role: st.role, name: st.name }
      setAvatarMap(map)
    }).catch((e) => {
      if (!active) return
      addToast({ type: 'error', title: 'Failed to load', body: e.message })
    }).finally(() => {
      if (active) setLoadingList(false)
    })
    return () => { active = false }
  }, [addToast])

  async function loadConversations() {
    try {
      const res = await api<{ conversations: Conversation[] }>('/api/messages')
      setConversations(res.conversations)
    } catch {
      /* non-fatal background refresh */
    }
  }

  async function loadThread(withId: string, markRead = true) {
    setLoadingThread(true)
    try {
      const res = await api<{ messages: Message[] }>('/api/messages', { query: { with: withId } })
      setMessages(res.messages)
      if (markRead) {
        api('/api/messages', { method: 'PATCH', body: { withId } }).catch(() => {})
        setConversations((prev) => prev.map((c) => (c.id === withId ? { ...c, unread: 0 } : c)))
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load messages', body: e.message })
    } finally {
      setLoadingThread(false)
    }
  }

  // Load active thread + poll for new messages — every 10s while the tab is
  // visible, paused entirely when hidden. No-op polls don't trigger re-renders.
  useEffect(() => {
    if (!activeId) return
    let active = true
    loadThread(activeId)
    async function poll() {
      if (!active || typeof document === 'undefined' || document.hidden) return
      try {
        const res = await api<{ messages: Message[] }>('/api/messages', { query: { with: activeId } })
        if (!active) return
        setMessages((prev) => {
          const prevLast = prev[prev.length - 1]
          const nextLast = res.messages[res.messages.length - 1]
          if (prev.length === res.messages.length && prevLast?.id === nextLast?.id) return prev
          return res.messages
        })
      } catch { /* ignore */ }
    }
    const interval = setInterval(poll, 10000)
    const onVisibility = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [activeId])

  // Auto-scroll to bottom whenever the thread changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function openConversation(id: string) {
    setActiveId(id)
    setMobileShowThread(true)
  }

  async function send() {
    if (!draft.trim() || !activeId) return
    setSending(true)
    try {
      await api('/api/messages', { method: 'POST', body: { toId: activeId, body: draft.trim() } })
      setDraft('')
      await loadThread(activeId, false)
      loadConversations()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Send failed', body: e.message })
    } finally {
      setSending(false)
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId)
  const activePartner: PartnerMeta | null = activeId
    ? (avatarMap[activeId] ?? {
        avatar: null,
        role: activeConv?.role ?? '',
        name: activeConv?.name ?? '',
      })
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold">
            <MessagesSquare className="h-5 w-5 text-emerald-600" /> Messages
          </h2>
          <p className="text-sm text-muted-foreground">Chat with students, staff, and parents in real time.</p>
        </div>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Message
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="grid h-[calc(100vh-13rem)] min-h-[480px] grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className={cn('flex flex-col border-r border-border', mobileShowThread && activeId ? 'hidden md:flex' : 'flex')}>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="h-9 pl-9" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No conversations yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> Start one</Button>
                </div>
              ) : (
                conversations.map((c) => {
                  const partner = avatarMap[c.id] ?? { avatar: null, role: c.role, name: c.name }
                  return (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-border p-3 text-left transition hover:bg-muted/50',
                        activeId === c.id && 'bg-emerald-50 dark:bg-emerald-950/20'
                      )}
                    >
                      <UserAvatar name={c.name} avatar={partner.avatar} role={partner.role} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                          {c.unread > 0 && (
                            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-[10px]">{c.role}</Badge>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Active thread */}
          <div className={cn('flex min-h-0 flex-col', mobileShowThread && activeId ? 'flex' : 'hidden md:flex')}>
            {!activeId ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <MessageSquare className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="text-xs">Choose a person from the list to start chatting.</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setMobileShowThread(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <UserAvatar name={activePartner?.name ?? ''} avatar={activePartner?.avatar ?? null} role={activePartner?.role} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{activePartner?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{activePartner?.role}</p>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                  {loadingThread ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 opacity-40" />
                      <p className="text-sm">No messages yet.</p>
                      <p className="text-xs">Say hello below!</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.fromId === user.id
                      return (
                        <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                          <div className="max-w-[80%] sm:max-w-[70%]">
                            <div
                              className={cn(
                                'rounded-2xl px-4 py-2 text-sm shadow-sm',
                                mine
                                  ? 'rounded-br-md bg-emerald-600 text-white'
                                  : 'rounded-bl-md border border-border bg-card'
                              )}
                            >
                              {m.body}
                            </div>
                            <p className={cn('mt-1 text-[10px] text-muted-foreground', mine ? 'text-right' : 'text-left')}>
                              {timeAgo(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="min-h-[44px] flex-1 resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          send()
                        }
                      }}
                    />
                    <Button onClick={send} disabled={sending || !draft.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700" size="icon">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">Press Enter to send · Shift+Enter for a new line</p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {showNew && (
        <NewMessageDialog
          currentId={user.id}
          avatarMap={avatarMap}
          onClose={() => setShowNew(false)}
          onSent={(toId) => {
            setShowNew(false)
            loadConversations()
            openConversation(toId)
          }}
        />
      )}
    </div>
  )
}

interface Recipient {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
}

function NewMessageDialog({ currentId, avatarMap, onClose, onSent }: {
  currentId: string
  avatarMap: Record<string, PartnerMeta>
  onClose: () => void
  onSent: (toId: string) => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      api<{ students: Student[] }>('/api/students'),
      api<{ staff: Staff[] }>('/api/staff'),
    ]).then(([s, st]) => {
      if (!active) return
      const list: Recipient[] = [
        ...st.staff.map((x) => ({ id: x.id, name: x.name, email: x.email, role: x.role, avatar: x.avatar })),
        ...s.students.map((x) => ({ id: x.id, name: x.name, email: x.email, role: 'Student' as const, avatar: x.avatar })),
      ]
      setRecipients(list)
    }).catch((e) => {
      addToast({ type: 'error', title: 'Failed to load users', body: e.message })
    }).finally(() => setLoading(false))
    return () => { active = false }
  }, [addToast])

  const filtered = recipients.filter((u) => {
    if (u.id === currentId) return false
    if (!query) return true
    const q = query.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  async function send() {
    if (!selected || !body.trim()) return
    setSending(true)
    try {
      await api('/api/messages', { method: 'POST', body: { toId: selected, body: body.trim() } })
      addToast({ type: 'success', title: 'Message sent' })
      onSent(selected)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Send failed', body: e.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students or staff..." className="pl-9" />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No people found.</div>
            ) : (
              filtered.map((u) => {
                const meta = avatarMap[u.id] ?? { avatar: u.avatar, role: u.role, name: u.name }
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelected(u.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border p-2.5 text-left transition last:border-0 hover:bg-muted/50',
                      selected === u.id && 'bg-emerald-50 dark:bg-emerald-950/20'
                    )}
                  >
                    <UserAvatar name={u.name} avatar={meta.avatar} role={meta.role} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                  </button>
                )
              })
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              disabled={!selected}
            />
          </div>
          {!selected && <p className="text-[11px] text-muted-foreground">Pick a recipient above to enable sending.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || !selected || !body.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
