'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Library, BookOpen, Plus, Search, Loader2, X, Send, BookCheck,
  ArrowRight, Clock, AlertCircle, BookMarked, Layers, Library as LibraryIcon,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Book, Loan } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
} from 'recharts'

// Category → tailwind classes for badge + card accent.
const CATEGORY_STYLES: Record<string, { badge: string; bar: string; dot: string }> = {
  Fiction: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    dot: '#10b981',
  },
  Science: {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    bar: 'bg-teal-500',
    dot: '#14b8a6',
  },
  Mathematics: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    bar: 'bg-amber-500',
    dot: '#f59e0b',
  },
  History: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    bar: 'bg-violet-500',
    dot: '#8b5cf6',
  },
  Reference: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    bar: 'bg-slate-500',
    dot: '#64748b',
  },
  General: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    bar: 'bg-cyan-500',
    dot: '#06b6d4',
  },
}

const CATEGORIES = ['Fiction', 'Science', 'Mathematics', 'History', 'Reference', 'General']

function styleFor(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.General
}

const STAFF_CAN_MANAGE = ['Admin', 'Principal', 'Teacher', 'Librarian']

export function LibraryView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [borrowing, setBorrowing] = useState<string | null>(null)
  const [returning, setReturning] = useState<string | null>(null)

  const isStudent = user.role === 'Student'
  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [bRes, lRes] = await Promise.all([
          api<{ books: Book[] }>('/api/books'),
          api<{ loans: Loan[] }>('/api/loans'),
        ])
        if (!active) return
        setBooks(bRes.books)
        setLoans(lRes.loans)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load library', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  // Derived summary stats
  const stats = useMemo(() => {
    const totalCopies = books.reduce((a, b) => a + b.copies, 0)
    const totalAvailable = books.reduce((a, b) => a + b.available, 0)
    const today = new Date().toISOString().slice(0, 10)
    const activeLoans = loans.filter((l) => l.status === 'Borrowed')
    const overdue = activeLoans.filter((l) => l.dueDate < today)
    return {
      totalTitles: books.length,
      totalCopies,
      available: totalAvailable,
      borrowed: activeLoans.length,
      overdue: overdue.length,
    }
  }, [books, loans])

  // Filtered books
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return books.filter((b) => {
      if (category !== 'all' && b.category !== category) return false
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn ?? '').toLowerCase().includes(q)
      )
    })
  }, [books, search, category])

  // Loans shown: students see their own (backend already filters), staff see all.
  // We'll separate active vs returned for clarity.
  const activeLoans = loans.filter((l) => l.status !== 'Returned')
  const today = new Date().toISOString().slice(0, 10)

  // Donut chart data: count of titles per category
  const categoryDist = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of books) map.set(b.category, (map.get(b.category) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: styleFor(name).dot }))
      .filter((d) => d.value > 0)
  }, [books])

  async function borrow(b: Book) {
    setBorrowing(b.id)
    try {
      await api('/api/loans', { method: 'POST', body: { bookId: b.id } })
      addToast({ type: 'success', title: 'Book borrowed', body: `"${b.title}" is now on your account.` })
      // refresh both lists
      const [bRes, lRes] = await Promise.all([
        api<{ books: Book[] }>('/api/books'),
        api<{ loans: Loan[] }>('/api/loans'),
      ])
      setBooks(bRes.books)
      setLoans(lRes.loans)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Borrow failed', body: e.message })
    } finally {
      setBorrowing(null)
    }
  }

  async function returnLoan(l: Loan) {
    setReturning(l.id)
    try {
      await api(`/api/loans/${l.id}`, { method: 'PATCH' })
      addToast({ type: 'success', title: 'Book returned', body: `"${l.bookTitle}" has been returned.` })
      const [bRes, lRes] = await Promise.all([
        api<{ books: Book[] }>('/api/books'),
        api<{ loans: Loan[] }>('/api/loans'),
      ])
      setBooks(bRes.books)
      setLoans(lRes.loans)
    } catch (e: any) {
      addToast({ type: 'error', title: 'Return failed', body: e.message })
    } finally {
      setReturning(null)
    }
  }

  function onBookSaved() {
    setAdding(false)
    ;(async () => {
      try {
        const res = await api<{ books: Book[] }>('/api/books')
        setBooks(res.books)
      } catch { /* ignore */ }
    })()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <LibraryIcon className="h-7 w-7" /> Library
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Browse the catalogue, borrow books, and track your loans.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Add Book
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookMarked} label="Total Titles" value={String(stats.totalTitles)} sub={`${stats.totalCopies} copies`} color="emerald" />
        <StatCard icon={BookOpen} label="Available" value={String(stats.available)} sub="in library" color="teal" />
        <StatCard icon={BookCheck} label="Borrowed" value={String(stats.borrowed)} sub="active loans" color="amber" />
        <StatCard icon={AlertCircle} label="Overdue" value={String(stats.overdue)} sub="needs return" color={stats.overdue > 0 ? 'red' : 'slate'} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Catalogue */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {/* Search + filter */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, author or ISBN…"
                    className="pl-9"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Book grid */}
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
                    <BookOpen className="h-10 w-10 opacity-40" />
                    <p className="text-sm">No books match your search.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((b) => {
                    const s = styleFor(b.category)
                    const isBorrowing = borrowing === b.id
                    return (
                      <Card key={b.id} className="overflow-hidden transition hover:shadow-md">
                        <div className={cn('h-1.5 w-full', s.bar)} />
                        <CardContent className="space-y-3 p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 font-semibold leading-snug">{b.title}</h3>
                              <p className="mt-0.5 text-xs text-muted-foreground">by {b.author}</p>
                            </div>
                            <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
                              {b.category}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {b.isbn && <span>ISBN: {b.isbn}</span>}
                            {b.shelf && <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {b.shelf}</span>}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="text-xs">
                              {b.available > 0 ? (
                                <span className="font-medium text-emerald-600">
                                  {b.available} of {b.copies} available
                                </span>
                              ) : (
                                <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                                  Unavailable
                                </Badge>
                              )}
                            </div>
                            {b.available > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => borrow(b)}
                                disabled={isBorrowing}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                {isBorrowing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookCheck className="h-4 w-4" />}
                                Borrow
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column: donut + loans */}
            <div className="space-y-6">
              {categoryDist.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Layers className="h-4 w-4 text-emerald-600" /> Categories
                    </CardTitle>
                    <CardDescription>Distribution by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                          {categoryDist.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookCheck className="h-4 w-4 text-emerald-600" />
                    {isStudent ? 'My Loans' : 'All Loans'}
                  </CardTitle>
                  <CardDescription>
                    {activeLoans.length} active {activeLoans.length === 1 ? 'loan' : 'loans'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeLoans.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                      <BookCheck className="h-8 w-8 opacity-40" />
                      <p className="text-xs">No active loans right now.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {activeLoans.map((l) => {
                        const overdue = l.dueDate < today && l.status === 'Borrowed'
                        return (
                          <div key={l.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{l.bookTitle}</p>
                                <p className="truncate text-xs text-muted-foreground">by {l.bookAuthor}</p>
                              </div>
                              <StatusBadge status={l.status} overdue={overdue} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {!isStudent && (
                                <span className="font-medium text-foreground/80">{l.userName}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Due {new Date(l.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span>Borrowed {timeAgo(l.borrowDate)}</span>
                            </div>
                            {l.status !== 'Returned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 h-7 w-full text-xs"
                                disabled={returning === l.id}
                                onClick={() => returnLoan(l)}
                              >
                                {returning === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookCheck className="h-3.5 w-3.5" />}
                                Return Book
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {adding && <AddBookDialog onClose={() => setAdding(false)} onSaved={onBookSaved} />}
    </div>
  )
}

function StatusBadge({ status, overdue }: { status: string; overdue: boolean }) {
  if (overdue) {
    return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Overdue</Badge>
  }
  if (status === 'Returned') {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Returned</Badge>
  }
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Borrowed</Badge>
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="mt-3 text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-[10px] font-medium text-emerald-600">{sub}</p>
      </CardContent>
    </Card>
  )
}

function AddBookDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [category, setCategory] = useState('Fiction')
  const [copies, setCopies] = useState('1')
  const [shelf, setShelf] = useState('')

  async function save() {
    if (!title.trim() || !author.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please enter a title and author.' })
      return
    }
    const n = Number(copies)
    if (!Number.isFinite(n) || n < 1) {
      addToast({ type: 'warning', title: 'Invalid copies', body: 'Copies must be at least 1.' })
      return
    }
    setSaving(true)
    try {
      await api('/api/books', {
        method: 'POST',
        body: {
          title: title.trim(),
          author: author.trim(),
          isbn: isbn.trim() || null,
          category,
          copies: n,
          shelf: shelf.trim() || null,
        },
      })
      addToast({ type: 'success', title: 'Book added', body: `"${title.trim()}" added to the library.` })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Add failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> Add Book
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Things Fall Apart" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Author *</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Chinua Achebe" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ISBN</Label>
              <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978-3-16-148410-0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Copies</Label>
              <Input type="number" min={1} value={copies} onChange={(e) => setCopies(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shelf location</Label>
              <Input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="e.g. A-12" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Add Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
