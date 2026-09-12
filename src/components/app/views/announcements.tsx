'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2, Loader2, Send, X } from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Announcement } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Principal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  'Vice Principal': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  Teacher: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Student: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

export function AnnouncementsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const canCompose = ['Admin', 'Principal', 'Teacher'].includes(user.role)
  const canDelete = user.role === 'Admin'

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ announcements: Announcement[] }>('/api/announcements')
        if (!active) return
        setItems(res.announcements)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load announcements', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  async function deleteItem(a: Announcement) {
    setDeleting(a.id)
    try {
      await api('/api/announcements', { method: 'DELETE', body: { id: a.id } })
      setItems((prev) => prev.filter((x) => x.id !== a.id))
      addToast({ type: 'success', title: 'Announcement deleted' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><Megaphone className="h-7 w-7" /> Announcements</h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">Stay up to date with the latest school news.</p>
          </div>
          {canCompose && (
            <Button onClick={() => setComposing(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> New Announcement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <Card><CardContent className="flex h-64 items-center justify-center p-0"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
            <Megaphone className="h-10 w-10 opacity-40" />
            <p className="text-sm">No announcements yet.</p>
            {canCompose && <p className="text-xs">Click "New Announcement" to post one.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((a) => (
            <Card key={a.id} className="transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-900/5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <UserAvatar name={a.authorName} size="md" role={a.authorRole} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{a.authorName}</p>
                        {a.authorRole && (
                          <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', ROLE_COLORS[a.authorRole] ?? 'bg-muted text-muted-foreground')}>{a.authorRole}</span>
                        )}
                        <span className="text-xs text-muted-foreground">· {timeAgo(a.createdAt)}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold">{a.title}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                    </div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-rose-600 hover:text-rose-700"
                      disabled={deleting === a.id}
                      onClick={() => deleteItem(a)}
                    >
                      {deleting === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {composing && (
        <ComposeDialog
          onClose={() => setComposing(false)}
          onSaved={() => { setComposing(false); /* reload */ ; (async () => {
            try {
              const res = await api<{ announcements: Announcement[] }>('/api/announcements')
              setItems(res.announcements)
            } catch { /* ignore */ }
          })() }}
        />
      )}
    </div>
  )
}

function ComposeDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function save() {
    if (!title.trim() || !body.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please add a title and body.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/announcements', { method: 'POST', body: { title: title.trim(), body: body.trim() } })
      addToast({ type: 'success', title: 'Announcement posted', body: 'Your announcement is now visible to everyone.' })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Post failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-emerald-600" /> New Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-term exams schedule" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your announcement..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
