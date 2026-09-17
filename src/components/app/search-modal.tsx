'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { UserAvatar } from './user-avatar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Result {
  id: string
  name: string
  role: string
  email: string
  admissionNo: string | null
  grade: number | null
  className: string | null
  avatar: string | null
  status: string
}

export function SearchModal() {
  const open = useAppStore((s) => s.searchOpen)
  const setOpen = useAppStore((s) => s.setSearchOpen)
  if (!open) return null
  return <SearchModalInner onClose={() => setOpen(false)} />
}

function SearchModalInner({ onClose }: { onClose: () => void }) {
  const setViewUserId = useAppStore((s) => s.setViewUserId)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const query = q.trim()
    if (!query) return
    let active = true
    const t = setTimeout(async () => {
      try {
        const res = await api<{ results: Result[] }>('/api/search', { query: { q: query } })
        if (active) setResults(res.results)
      } catch { /* ignore */ }
    }, 200)
    return () => { active = false; clearTimeout(t) }
  }, [q])

  function openResult(r: Result) {
    setViewUserId(r.id)
    setActiveView('profile')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/50 p-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-slide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => { const v = e.target.value; setQ(v); if (!v.trim()) setResults([]) }}
            placeholder="Search students, staff, by name or ID..."
            className="border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {q.trim() && results.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No results for &ldquo;{q}&rdquo;</p>
          )}
          {!q.trim() && (
            <p className="p-6 text-center text-sm text-muted-foreground">Start typing to search students and staff</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => openResult(r)}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-muted"
            >
              <UserAvatar name={r.name} avatar={r.avatar} role={r.role} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.role} {r.admissionNo ? `· ${r.admissionNo}` : ''} {r.className ? `· ${r.className}` : ''}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', r.role === 'Student' ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300')}>
                {r.role}
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}
