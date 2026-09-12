'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, Plus, Loader2, X, Send, Trash2, Pencil, Settings2, Check,
  TrendingDown, TrendingUp, PiggyBank, Receipt, ArrowRight,
  Banknote, CircleDollarSign, AlertCircle, CalendarDays,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Budget, Expense } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'

// All money values are stored as CENTS.
const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)

const EXPENSE_CATEGORIES = [
  'Salaries', 'Supplies', 'Maintenance', 'Transport', 'Utilities',
  'Events', 'Health', 'Sports', 'Other',
] as const

const CATEGORY_BADGE: Record<string, string> = {
  Salaries: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Supplies: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  Maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Transport: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  Utilities: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  Events: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  Health: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  Sports: 'bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300',
  Other: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

function badgeFor(cat: string) {
  return CATEGORY_BADGE[cat] ?? CATEGORY_BADGE.Other
}

const PERIODS = ['Monthly', 'Quarterly', 'Termly', 'Annual'] as const

export function FinanceView() {
  const addToast = useAppStore((s) => s.addToast)

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [addingExpense, setAddingExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [managingBudgets, setManagingBudgets] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [bRes, eRes] = await Promise.all([
          api<{ budgets: Budget[] }>('/api/budgets'),
          api<{ expenses: Expense[] }>('/api/expenses'),
        ])
        if (!active) return
        setBudgets(bRes.budgets)
        setExpenses(eRes.expenses)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load finance', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    const totalAllocated = budgets.reduce((a, b) => a + b.allocated, 0)
    const totalSpent = expenses.reduce((a, e) => a + e.amount, 0)
    const remaining = totalAllocated - totalSpent
    const utilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0
    return { totalAllocated, totalSpent, remaining, utilization }
  }, [budgets, expenses])

  // Bar chart data: one bar per budget category with allocated + spent
  const chartData = useMemo(() => {
    return budgets.map((b) => ({
      category: b.category.length > 10 ? b.category.slice(0, 9) + '…' : b.category,
      Allocated: Math.round(b.allocated / 100),
      Spent: Math.round(b.spent / 100),
    }))
  }, [budgets])

  // Sorted expenses (most recent first)
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const da = a.date || a.createdAt
      const db = b.date || b.createdAt
      return db.localeCompare(da)
    })
  }, [expenses])

  function budgetFor(expense: Expense): Budget | undefined {
    if (!expense.budgetId) return undefined
    return budgets.find((b) => b.id === expense.budgetId)
  }

  async function refresh() {
    try {
      const [bRes, eRes] = await Promise.all([
        api<{ budgets: Budget[] }>('/api/budgets'),
        api<{ expenses: Expense[] }>('/api/expenses'),
      ])
      setBudgets(bRes.budgets)
      setExpenses(eRes.expenses)
    } catch { /* ignore */ }
  }

  async function deleteExpense(e: Expense) {
    if (!confirm(`Delete expense "${e.description}"?`)) return
    try {
      await api(`/api/expenses/${e.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Expense deleted', body: e.description })
      await refresh()
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete failed', body: err.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header — emerald gradient banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <Wallet className="h-7 w-7" /> School Finance
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Budget allocation, expense tracking, and financial overview.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              onClick={() => setAddingExpense(true)}
              variant="secondary"
              className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
            <Button
              onClick={() => setManagingBudgets(true)}
              variant="secondary"
              className="border-0 bg-white/10 text-white backdrop-blur hover:bg-white/20"
            >
              <Settings2 className="h-4 w-4" /> Manage Budgets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="Total Budget"
          value={formatMoney(stats.totalAllocated)}
          sub={`${budgets.length} ${budgets.length === 1 ? 'category' : 'categories'}`}
          color="emerald"
        />
        <StatCard
          icon={Receipt}
          label="Total Spent"
          value={formatMoney(stats.totalSpent)}
          sub={`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}`}
          color="amber"
        />
        <StatCard
          icon={stats.remaining >= 0 ? PiggyBank : TrendingDown}
          label="Remaining"
          value={formatMoney(stats.remaining)}
          sub={stats.remaining >= 0 ? 'under budget' : 'over budget'}
          color={stats.remaining >= 0 ? 'teal' : 'red'}
        />
        <StatCard
          icon={stats.utilization < 90 ? TrendingUp : AlertCircle}
          label="Utilization"
          value={`${stats.utilization}%`}
          sub={stats.utilization < 75 ? 'healthy' : stats.utilization < 95 ? 'watch closely' : 'critical'}
          color={stats.utilization < 75 ? 'emerald' : stats.utilization < 95 ? 'amber' : 'red'}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Budget overview: chart + category cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            {chartData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Banknote className="h-4 w-4 text-emerald-600" /> Budget vs Spending
                  </CardTitle>
                  <CardDescription>Allocated vs spent per category (in dollars).</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--popover))',
                          color: 'hsl(var(--popover-foreground))',
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Allocated" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card className={cn(chartData.length === 0 && 'lg:col-span-3')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PiggyBank className="h-4 w-4 text-emerald-600" /> Budget Categories
                </CardTitle>
                <CardDescription>
                  {budgets.length === 0 ? 'No budgets defined yet.' : `${budgets.length} ${budgets.length === 1 ? 'category' : 'categories'} tracked.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {budgets.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <Wallet className="h-8 w-8 opacity-40" />
                    <p className="text-xs">No budgets created.</p>
                    <Button size="sm" onClick={() => setManagingBudgets(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      <Settings2 className="h-4 w-4" /> Add a budget
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {budgets.map((b) => {
                      const pct = b.allocated > 0 ? Math.min(100, Math.round((b.spent / b.allocated) * 100)) : 0
                      const remaining = b.allocated - b.spent
                      const tone = pct < 75 ? 'emerald' : pct < 95 ? 'amber' : 'red'
                      return (
                        <div key={b.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{b.category}</p>
                              <p className="text-[11px] text-muted-foreground">{b.period}</p>
                            </div>
                            <span className={cn(
                              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                              tone === 'emerald' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                              tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                              tone === 'red' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
                            )}>
                              {pct}%
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={cn(
                              'mt-2 h-1.5',
                              tone === 'emerald' && '[&>div]:bg-emerald-500',
                              tone === 'amber' && '[&>div]:bg-amber-500',
                              tone === 'red' && '[&>div]:bg-rose-500',
                            )}
                          />
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>Spent <span className="font-medium text-foreground/80">{formatMoney(b.spent)}</span></span>
                            <span>of <span className="font-medium text-foreground/80">{formatMoney(b.allocated)}</span></span>
                            <span className={cn('font-medium', remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                              {remaining >= 0 ? 'left ' : 'over '} {formatMoney(Math.abs(remaining))}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expenses table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-emerald-600" /> Expenses
              </CardTitle>
              <CardDescription>
                {expenses.length} {expenses.length === 1 ? 'record' : 'records'} logged.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sortedExpenses.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Receipt className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No expenses recorded yet.</p>
                  <Button size="sm" onClick={() => setAddingExpense(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Log the first expense
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Description</th>
                        <th className="p-3 text-left font-medium">Category</th>
                        <th className="p-3 text-left font-medium">Amount</th>
                        <th className="hidden p-3 text-left font-medium sm:table-cell">Date</th>
                        <th className="hidden p-3 text-left font-medium lg:table-cell">Recorded By</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExpenses.map((e) => {
                        const linked = budgetFor(e)
                        return (
                          <tr key={e.id} className="border-b border-border transition hover:bg-muted/40">
                            <td className="p-3">
                              <p className="truncate font-medium">{e.description}</p>
                              {linked && (
                                <p className="text-[11px] text-muted-foreground">→ {linked.category}</p>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', badgeFor(e.category))}>
                                {e.category}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold">{formatMoney(e.amount)}</span>
                            </td>
                            <td className="hidden p-3 text-muted-foreground sm:table-cell">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </span>
                            </td>
                            <td className="hidden p-3 text-muted-foreground lg:table-cell">
                              {e.recordedByName ?? '—'}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingExpense(e)}>
                                  <Pencil className="h-4 w-4" /> <span className="sr-only">Edit</span>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteExpense(e)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40">
                                  <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {addingExpense && (
        <ExpenseDialog
          budgets={budgets}
          onClose={() => setAddingExpense(false)}
          onSaved={async () => { setAddingExpense(false); await refresh() }}
        />
      )}
      {editingExpense && (
        <ExpenseDialog
          budgets={budgets}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={async () => { setEditingExpense(null); await refresh() }}
        />
      )}
      {managingBudgets && (
        <BudgetsDialog
          budgets={budgets}
          onClose={() => setManagingBudgets(false)}
          onSaved={async () => { await refresh() }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
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

// ---------------------------------------------------------------------------
// Expense Dialog (add + edit)
// ---------------------------------------------------------------------------
function ExpenseDialog({
  budgets, expense, onClose, onSaved,
}: {
  budgets: Budget[]
  expense?: Expense
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState(expense?.description ?? '')
  const [category, setCategory] = useState<string>(expense?.category ?? 'Supplies')
  const [amount, setAmount] = useState(expense ? String((expense.amount / 100).toFixed(2)) : '')
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10))
  const [budgetId, setBudgetId] = useState<string>(expense?.budgetId ?? 'none')

  async function save() {
    if (!description.trim()) {
      addToast({ type: 'warning', title: 'Missing description', body: 'Please enter an expense description.' })
      return
    }
    const dollars = Number(amount)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      addToast({ type: 'warning', title: 'Invalid amount', body: 'Amount must be a positive number.' })
      return
    }
    if (!date) {
      addToast({ type: 'warning', title: 'Missing date', body: 'Please pick an expense date.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        description: description.trim(),
        category,
        amount: Math.round(dollars * 100), // dollars → cents
        date,
        budgetId: budgetId === 'none' ? null : budgetId,
      }
      if (expense) {
        await api(`/api/expenses/${expense.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Expense updated', body: description.trim() })
      } else {
        await api('/api/expenses', { method: 'POST', body })
        addToast({ type: 'success', title: 'Expense logged', body: description.trim() })
      }
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            {expense ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <DialogDescription>
            {expense ? 'Update the expense details below.' : 'Record a new school expense.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Chemistry lab supplies" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount (USD) *</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-7" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link to Budget</Label>
              <Select value={budgetId} onValueChange={setBudgetId}>
                <SelectTrigger><SelectValue placeholder="No budget" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No budget</SelectItem>
                  {budgets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {expense ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Budgets Dialog (manage + add)
// ---------------------------------------------------------------------------
function BudgetsDialog({
  budgets, onClose, onSaved,
}: {
  budgets: Budget[]
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)

  // Editable allocated amounts keyed by budget id (kept in dollars for display).
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const b of budgets) m[b.id] = (b.allocated / 100).toFixed(2)
    return m
  })
  const [savingId, setSavingId] = useState<string | null>(null)

  // New budget fields
  const [newCat, setNewCat] = useState('')
  const [newAlloc, setNewAlloc] = useState('')
  const [newPeriod, setNewPeriod] = useState<string>('Monthly')
  const [adding, setAdding] = useState(false)

  async function saveOne(b: Budget) {
    const dollars = Number(drafts[b.id])
    if (!Number.isFinite(dollars) || dollars < 0) {
      addToast({ type: 'warning', title: 'Invalid amount', body: 'Allocation must be a non-negative number.' })
      return
    }
    setSavingId(b.id)
    try {
      await api(`/api/budgets/${b.id}`, {
        method: 'PATCH',
        body: { allocated: Math.round(dollars * 100) },
      })
      addToast({ type: 'success', title: 'Budget updated', body: `${b.category} → ${formatMoney(Math.round(dollars * 100))}` })
      await onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update failed', body: e.message })
    } finally {
      setSavingId(null)
    }
  }

  async function addBudget() {
    if (!newCat.trim()) {
      addToast({ type: 'warning', title: 'Missing category', body: 'Please enter a budget category name.' })
      return
    }
    const dollars = Number(newAlloc)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      addToast({ type: 'warning', title: 'Invalid amount', body: 'Allocation must be a positive number.' })
      return
    }
    setAdding(true)
    try {
      await api('/api/budgets', {
        method: 'POST',
        body: { category: newCat.trim(), allocated: Math.round(dollars * 100), period: newPeriod },
      })
      addToast({ type: 'success', title: 'Budget added', body: `${newCat.trim()} created.` })
      setNewCat('')
      setNewAlloc('')
      setNewPeriod('Monthly')
      await onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Add failed', body: e.message })
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-emerald-600" /> Manage Budgets
          </DialogTitle>
          <DialogDescription>Adjust allocations or create new budget categories.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing budgets */}
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {budgets.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
                <Wallet className="h-8 w-8 opacity-40" />
                <p className="text-xs">No budgets yet. Add one below.</p>
              </div>
            ) : (
              budgets.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.category}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.period} · Spent {formatMoney(b.spent)} of {formatMoney(b.allocated)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={drafts[b.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                        className="h-9 pl-6 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveOne(b)}
                      disabled={savingId === b.id}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {savingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      <span className="sr-only">Save</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Add new budget */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Plus className="h-4 w-4 text-emerald-600" /> Add New Budget
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</Label>
                <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. I.T." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Allocation ($)</Label>
                <Input type="number" min="0" step="0.01" value={newAlloc} onChange={(e) => setNewAlloc(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Period</Label>
                <Select value={newPeriod} onValueChange={setNewPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addBudget} disabled={adding} className="mt-3 bg-emerald-600 text-white hover:bg-emerald-700">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Budget
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
