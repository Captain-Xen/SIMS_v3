'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DollarSign, Loader2, CheckCircle2, Clock, TrendingUp, CreditCard, Search, Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Fee } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function FeesView() {
  const user = useAppStore((s) => s.user)!
  if (user.role === 'Student') return <StudentFees />
  return <AdminFees />
}

function AdminFees() {
  const addToast = useAppStore((s) => s.addToast)
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ fees: Fee[] }>('/api/fees')
        if (!active) return
        setFees(res.fees)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load fees', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const filtered = useMemo(() => {
    return fees.filter((f) => {
      if (statusFilter && f.status !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return f.studentName.toLowerCase().includes(q) || f.term.toLowerCase().includes(q)
      }
      return true
    })
  }, [fees, query, statusFilter])

  const stats = useMemo(() => {
    const collected = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)
    const pending = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
    const total = collected + pending
    const rate = total ? Math.round((collected / total) * 100) : 0
    return { collected, pending, total, rate, paidCount: fees.filter((f) => f.status === 'Paid').length, pendingCount: fees.filter((f) => f.status === 'Pending').length }
  }, [fees])

  async function toggleStatus(f: Fee) {
    setUpdating(f.id)
    const next = f.status === 'Paid' ? 'Pending' : 'Paid'
    try {
      await api('/api/fees', { method: 'PATCH', body: { id: f.id, status: next } })
      setFees((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: next } : x)))
      addToast({ type: 'success', title: `Marked as ${next}`, body: `${f.studentName}'s fee is now ${next}.` })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update failed', body: e.message })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><DollarSign className="h-7 w-7" /> Fee Management</h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">Track and manage student fee payments.</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><DollarSign className="h-5 w-5" /></div><div><p className="text-2xl font-bold">${stats.collected.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total collected</p></div></CardContent></Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Clock className="h-5 w-5" /></div><div><p className="text-2xl font-bold">${stats.pending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><TrendingUp className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.rate}%</p><p className="text-xs text-muted-foreground">Collection rate</p></div></CardContent></Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.paidCount}<span className="text-sm font-normal text-muted-foreground">/{fees.length}</span></p><p className="text-xs text-muted-foreground">Paid records</p></div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student name or term..." className="pl-10" />
          </div>
          <div className="flex gap-2">
            {['', 'Paid', 'Pending'].map((s) => (
              <Button key={s || 'all'} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className={statusFilter === s ? 'bg-brand text-brand-foreground hover:bg-brand-strong' : ''} onClick={() => setStatusFilter(s)}>{s || 'All'}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <DollarSign className="h-10 w-10 opacity-40" />
              <p className="text-sm">No fee records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Student</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Term</th>
                    <th className="p-3 text-left font-medium">Amount</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Due Date</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-b border-border transition hover:bg-muted/40">
                      <td className="p-3 font-medium">{f.studentName}</td>
                      <td className="hidden p-3 text-muted-foreground sm:table-cell">{f.term}</td>
                      <td className="p-3 font-semibold">${f.amount.toLocaleString()}</td>
                      <td className="hidden p-3 text-muted-foreground md:table-cell">
                        <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(f.dueDate).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn('border-transparent', f.status === 'Paid' ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>{f.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant={f.status === 'Paid' ? 'outline' : 'default'}
                          size="sm"
                          disabled={updating === f.id}
                          onClick={() => toggleStatus(f)}
                          className={f.status === 'Paid' ? '' : 'bg-brand text-brand-foreground hover:bg-brand-strong'}
                        >
                          {updating === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {f.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StudentFees() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ fees: Fee[] }>('/api/fees')
        if (!active) return
        setFees(res.fees.filter((f) => f.studentId === user.id))
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load fees', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, user.id])

  async function pay(f: Fee) {
    setPaying(f.id)
    try {
      await api('/api/fees', { method: 'PATCH', body: { id: f.id, status: 'Paid' } })
      setFees((prev) => prev.map((x) => (x.id === f.id ? { ...x, status: 'Paid' } : x)))
      addToast({ type: 'success', title: 'Payment successful', body: `$${f.amount.toLocaleString()} paid for ${f.term}.` })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Payment failed', body: e.message })
    } finally {
      setPaying(null)
    }
  }

  const totalDue = fees.filter((f) => f.status === 'Pending').reduce((a, f) => a + f.amount, 0)
  const totalPaid = fees.filter((f) => f.status === 'Paid').reduce((a, f) => a + f.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Clock className="h-5 w-5" /></div><div><p className="text-2xl font-bold">${totalDue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Outstanding balance</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total paid</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><CreditCard className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{fees.length}</p><p className="text-xs text-muted-foreground">Fee records</p></div></CardContent></Card>
      </div>

      {/* Fee cards */}
      {loading ? (
        <Card><CardContent className="flex h-64 items-center justify-center p-0"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
            <DollarSign className="h-10 w-10 opacity-40" />
            <p className="text-sm">No fee records on file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fees.map((f) => (
            <Card key={f.id} className={cn('overflow-hidden', f.status === 'Paid' ? 'border-brand/35 dark:border-brand/30' : '')}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div>
                  <CardTitle className="text-base">{f.term}</CardTitle>
                  <CardDescription>Due {new Date(f.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</CardDescription>
                </div>
                <Badge variant="outline" className={cn('border-transparent', f.status === 'Paid' ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>{f.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-3xl font-bold">${f.amount.toLocaleString()}</p>
                  </div>
                  {f.status === 'Pending' ? (
                    <Button onClick={() => pay(f)} disabled={paying === f.id} className="bg-brand text-brand-foreground hover:bg-brand-strong">
                      {paying === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Pay Now
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand"><CheckCircle2 className="h-4 w-4" /> Paid</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
