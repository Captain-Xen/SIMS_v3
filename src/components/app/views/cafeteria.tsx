'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UtensilsCrossed, Wallet, Salad, AlertTriangle, Users, Plus, Search, Eye,
  ArrowUpCircle, X, Loader2, Send, ShoppingCart, Coffee, Cookie,
  Clock, CheckCircle2, ChevronRight, Utensils, Store,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { MealAccount, MealTransaction, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

// Currency helper — balance/amount are stored in CENTS.
const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)

const MEAL_PLANS = ['Standard', 'Premium', 'Basic'] as const
const DIETARY_TAGS = ['Vegetarian', 'Halal', 'Gluten-Free', 'Kosher', 'Dairy-Free', 'Nut-Free'] as const

const PLAN_BADGE: Record<string, string> = {
  Standard: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Premium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Basic: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
}

const TAG_BADGE: Record<string, string> = {
  Vegetarian: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Halal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'Gluten-Free': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Kosher: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  'Dairy-Free': 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'Nut-Free': 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
}

function balanceTone(cents: number) {
  if (cents > 500) return 'text-emerald-600 dark:text-emerald-400'
  if (cents >= 100) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// Mock cafeteria menu (student "today's menu")
const MENU = [
  { section: 'Breakfast', icon: Coffee, items: [
    { name: 'Ackee & Saltfish', price: 350, tags: ['Vegetarian'] },
    { name: 'Boiled Eggs & Toast', price: 250, tags: ['Vegetarian'] },
    { name: 'Mackerel Run-Down', price: 400, tags: [] },
  ]},
  { section: 'Lunch', icon: Utensils, items: [
    { name: 'Jerk Chicken with Rice', price: 650, tags: [] },
    { name: 'Curried Chickpeas & Roti', price: 550, tags: ['Vegetarian', 'Vegan'] },
    { name: 'Brown Stew Fish', price: 700, tags: [] },
  ]},
  { section: 'Snacks', icon: Cookie, items: [
    { name: 'Fruit Cup', price: 200, tags: ['Vegetarian', 'Gluten-Free'] },
    { name: 'Peanut Patty', price: 150, tags: ['Vegetarian'] },
    { name: 'Yoghurt Parfait', price: 250, tags: ['Vegetarian'] },
  ]},
] as const

const STAFF_ROLES = ['Admin', 'Principal']

export function CafeteriaView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const isStaff = STAFF_ROLES.includes(user.role)
  const isStudent = user.role === 'Student'

  const [accounts, setAccounts] = useState<MealAccount[]>([])
  const [myAccount, setMyAccount] = useState<MealAccount | null>(null)
  const [myTransactions, setMyTransactions] = useState<MealTransaction[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const [creating, setCreating] = useState(false)
  const [topUpFor, setTopUpFor] = useState<MealAccount | null>(null)
  const [txFor, setTxFor] = useState<MealAccount | null>(null)
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [buying, setBuying] = useState<string | null>(null) // menu item name being purchased

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        if (isStaff) {
          const [aRes, sRes] = await Promise.all([
            api<{ accounts: MealAccount[] }>('/api/meal-accounts'),
            api<{ students: Student[] }>('/api/students'),
          ])
          if (!active) return
          setAccounts(aRes.accounts)
          setStudents(sRes.students)
        } else {
          const aRes = await api<{ account: MealAccount | null }>('/api/meal-accounts')
          if (!active) return
          setMyAccount(aRes.account)
          setMyTransactions(aRes.account?.transactions ?? [])
        }
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load cafeteria', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast, isStaff])

  // ---- STAFF: derived stats ----
  const stats = useMemo(() => {
    const total = accounts.length
    const totalBalance = accounts.reduce((a, b) => a + b.balance, 0)
    const activePlans = accounts.filter((a) => a.mealPlan && a.mealPlan !== 'None').length
    const withDietary = accounts.filter((a) => a.dietaryTags && a.dietaryTags.length > 0).length
    return { total, totalBalance, activePlans, withDietary }
  }, [accounts])

  async function refreshAccounts() {
    try {
      const aRes = await api<{ accounts: MealAccount[] }>('/api/meal-accounts')
      setAccounts(aRes.accounts)
    } catch { /* ignore */ }
  }

  async function refreshMyAccount() {
    try {
      const aRes = await api<{ account: MealAccount | null }>('/api/meal-accounts')
      setMyAccount(aRes.account)
      setMyTransactions(aRes.account?.transactions ?? [])
    } catch { /* ignore */ }
  }

  // ---- STUDENT: buy a menu item ----
  async function buyItem(name: string, priceCents: number) {
    if (!myAccount) return
    if (myAccount.balance < priceCents) {
      addToast({ type: 'warning', title: 'Insufficient balance', body: 'Top up your account first.' })
      return
    }
    setBuying(name)
    try {
      await api('/api/meal-transactions', {
        method: 'POST',
        body: { accountId: myAccount.id, type: 'Purchase', amount: -priceCents, description: `Cafeteria: ${name}` },
      })
      addToast({ type: 'success', title: 'Purchase complete', body: `${name} — ${formatMoney(priceCents)} deducted.` })
      await refreshMyAccount()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Purchase failed', body: e.message })
    } finally {
      setBuying(null)
    }
  }

  function requestTopUp() {
    addToast({
      type: 'info',
      title: 'Top-up request sent',
      body: 'Your request has been forwarded to the finance office.',
    })
  }

  // ---------- RENDER ----------
  return (
    <div className="space-y-6">
      {/* Header — polished emerald gradient banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              <UtensilsCrossed className="h-7 w-7" /> Cafeteria
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Meal plans, lunch accounts, and dietary information.
            </p>
          </div>
          {isStaff && (
            <Button onClick={() => setCreating(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
              <Plus className="h-4 w-4" /> Create Account
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isStaff ? (
        <>
          {/* Staff stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Accounts" value={String(stats.total)} sub="meal accounts" color="emerald" />
            <StatCard icon={Wallet} label="Total Balance" value={formatMoney(stats.totalBalance)} sub="across accounts" color="teal" />
            <StatCard icon={UtensilsCrossed} label="Active Plans" value={String(stats.activePlans)} sub="with meal plan" color="amber" />
            <StatCard icon={Salad} label="Dietary Restrictions" value={String(stats.withDietary)} sub="special diets" color="cyan" />
          </div>

          {/* Accounts table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-emerald-600" /> Meal Accounts
              </CardTitle>
              <CardDescription>Manage student lunch accounts and balances.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {accounts.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Store className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No meal accounts yet.</p>
                  <Button size="sm" onClick={() => setCreating(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Create the first account
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Student</th>
                        <th className="hidden p-3 text-left font-medium sm:table-cell">Meal Plan</th>
                        <th className="p-3 text-left font-medium">Balance</th>
                        <th className="hidden p-3 text-left font-medium lg:table-cell">Dietary Tags</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a) => (
                        <tr key={a.id} className="border-b border-border transition hover:bg-muted/40">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={a.userName} role="Student" size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{a.userName}</p>
                                <p className="text-xs text-muted-foreground">Updated {timeAgo(a.updatedAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden p-3 sm:table-cell">
                            <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', PLAN_BADGE[a.mealPlan] ?? 'bg-slate-100 text-slate-700')}>
                              {a.mealPlan}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={cn('font-semibold', balanceTone(a.balance))}>{formatMoney(a.balance)}</span>
                          </td>
                          <td className="hidden p-3 lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {a.dietaryTags && a.dietaryTags.length > 0 ? (
                                a.dietaryTags.map((t) => (
                                  <span key={t} className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium', TAG_BADGE[t] ?? 'bg-muted text-muted-foreground')}>
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setTopUpFor(a)}>
                                <ArrowUpCircle className="h-4 w-4 text-emerald-600" /> Top Up
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setTxFor(a)}>
                                <Eye className="h-4 w-4" /> Transactions
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* STUDENT VIEW */
        !myAccount ? (
          <Card>
            <CardContent className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Wallet className="h-10 w-10 opacity-40" />
              <p className="text-sm">You don't have a meal account yet.</p>
              <p className="text-xs">Please contact the finance office to set one up.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Balance card (spans 2) */}
              <div className="lg:col-span-2">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
                  <CardContent className="relative space-y-4 p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-50/85">
                          <Wallet className="h-3.5 w-3.5" /> Current Balance
                        </p>
                        <p className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
                          {formatMoney(myAccount.balance)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', PLAN_BADGE[myAccount.mealPlan] ?? 'bg-white/20')}>
                            {myAccount.mealPlan} Plan
                          </span>
                          {myAccount.dietaryTags.map((t) => (
                            <span key={t} className="inline-flex rounded bg-white/15 px-2 py-0.5 text-[10px] font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                        <UtensilsCrossed className="h-6 w-6" />
                      </div>
                    </div>

                    {myAccount.balance < 500 && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-amber-50">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p className="text-xs">
                          {myAccount.balance < 100
                            ? 'Your balance is critically low — please top up before your next meal.'
                            : 'Your balance is running low — consider topping up soon.'}
                        </p>
                      </div>
                    )}

                    <Separator className="bg-white/20" />

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={requestTopUp} variant="secondary" className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                        <ArrowUpCircle className="h-4 w-4" /> Request Top-Up
                      </Button>
                      <Button onClick={() => setEditingPrefs(true)} variant="secondary" className="border-0 bg-white/10 text-white backdrop-blur hover:bg-white/20">
                        <Salad className="h-4 w-4" /> Dietary Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Today's menu */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Utensils className="h-4 w-4 text-emerald-600" /> Today's Menu
                    </CardTitle>
                    <CardDescription>Grab a meal directly from your account balance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {MENU.map((sec) => {
                      const SecIcon = sec.icon
                      return (
                        <div key={sec.section}>
                          <div className="mb-2 flex items-center gap-2">
                            <SecIcon className="h-4 w-4 text-emerald-600" />
                            <h4 className="text-sm font-semibold">{sec.section}</h4>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {sec.items.map((it) => {
                              const canAfford = myAccount.balance >= it.price
                              const isBuying = buying === it.name
                              return (
                                <div key={it.name} className={cn(
                                  'flex flex-col rounded-lg border border-border bg-card p-3 transition hover:shadow-md',
                                  !canAfford && 'opacity-60'
                                )}>
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium">{it.name}</p>
                                    <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatMoney(it.price)}
                                    </span>
                                  </div>
                                  {it.tags.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {it.tags.map((t) => (
                                        <span key={t} className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium', TAG_BADGE[t] ?? 'bg-muted text-muted-foreground')}>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    className="mt-3 bg-emerald-600 text-white hover:bg-emerald-700"
                                    disabled={!canAfford || isBuying}
                                    onClick={() => buyItem(it.name, it.price)}
                                  >
                                    {isBuying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                                    {canAfford ? 'Buy Now' : 'Insufficient'}
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Right column: transaction history */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-emerald-600" /> Recent Transactions
                  </CardTitle>
                  <CardDescription>
                    {myTransactions.length} {myTransactions.length === 1 ? 'transaction' : 'transactions'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {myTransactions.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 opacity-40" />
                      <p className="text-xs">No transactions yet.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                      {myTransactions.map((t) => (
                        <TransactionRow key={t.id} t={t} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}

      {/* Dialogs */}
      {creating && (
        <CreateAccountDialog
          students={students}
          existingUserIds={new Set(accounts.map((a) => a.userId))}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); refreshAccounts() }}
        />
      )}

      {topUpFor && (
        <TopUpDialog
          account={topUpFor}
          onClose={() => setTopUpFor(null)}
          onSaved={() => { setTopUpFor(null); refreshAccounts() }}
        />
      )}

      {txFor && (
        <TransactionsDialog
          account={txFor}
          onClose={() => setTxFor(null)}
        />
      )}

      {editingPrefs && myAccount && (
        <EditPreferencesDialog
          account={myAccount}
          onClose={() => setEditingPrefs(false)}
          onSaved={() => { setEditingPrefs(false); refreshMyAccount() }}
        />
      )}
    </div>
  )
}

/* ---------------- Sub-components ---------------- */

function TransactionRow({ t }: { t: MealTransaction }) {
  const isTopup = t.type === 'Topup'
  const Icon = isTopup ? ArrowUpCircle : ShoppingCart
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        isTopup ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.description}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {timeAgo(t.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className={cn('text-sm font-semibold', isTopup ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
          {isTopup ? '+' : ''}{formatMoney(t.amount)}
        </p>
        <span className={cn(
          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
          isTopup ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
        )}>
          {t.type}
        </span>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  }
  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition group-hover:from-emerald-500/10 group-hover:to-teal-500/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

/* ---------------- Dialogs ---------------- */

function CreateAccountDialog({
  students, existingUserIds, onClose, onSaved,
}: {
  students: Student[]
  existingUserIds: Set<string>
  onClose: () => void
  onSaved: () => void
}) {
  const addToast = useAppStore((s) => s.addToast)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [mealPlan, setMealPlan] = useState<string>('Standard')
  const [tags, setTags] = useState<string[]>([])
  const [initialBalance, setInitialBalance] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (existingUserIds.has(s.id)) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.admissionNo ?? '').toLowerCase().includes(q)
      )
    })
  }, [students, search, existingUserIds])

  function toggleTag(t: string) {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  async function save() {
    if (!userId) {
      addToast({ type: 'warning', title: 'Pick a student', body: 'Select a student to create an account for.' })
      return
    }
    const balCents = Math.round((Number(initialBalance) || 0) * 100)
    setSaving(true)
    try {
      await api('/api/meal-accounts', {
        method: 'POST',
        body: { userId, mealPlan, dietaryTags: tags, initialBalance: balCents },
      })
      addToast({ type: 'success', title: 'Account created', body: `Meal account created with ${formatMoney(balCents)}.` })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Create failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> Create Meal Account
          </DialogTitle>
          <DialogDescription>Open a new lunch account for a student.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Student picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student *</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or admission no…" className="pl-9" />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              {filtered.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  No eligible students.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.slice(0, 100).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setUserId(s.id)}
                        className={cn(
                          'flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50',
                          userId === s.id && 'bg-emerald-50 dark:bg-emerald-950/30'
                        )}
                      >
                        <UserAvatar name={s.name} avatar={s.avatar} role="Student" size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.admissionNo ?? '—'} · {s.className ?? '—'}</p>
                        </div>
                        {userId === s.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Meal plan */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meal Plan</Label>
              <Select value={mealPlan} onValueChange={setMealPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Initial Balance ($)</Label>
              <Input type="number" min={0} step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          {/* Dietary tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dietary Tags</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIETARY_TAGS.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm transition hover:bg-muted/50">
                  <Checkbox checked={tags.includes(t)} onCheckedChange={() => toggleTag(t)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TopUpDialog({ account, onClose, onSaved }: { account: MealAccount; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const dollars = Number(amount)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      addToast({ type: 'warning', title: 'Invalid amount', body: 'Enter an amount greater than $0.' })
      return
    }
    const cents = Math.round(dollars * 100)
    setSaving(true)
    try {
      await api('/api/meal-transactions', {
        method: 'POST',
        body: { accountId: account.id, type: 'Topup', amount: cents, description: description.trim() || 'Account top-up' },
      })
      addToast({ type: 'success', title: 'Top-up successful', body: `${formatMoney(cents)} added to ${account.userName}'s account.` })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Top-up failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-600" /> Top Up Account
          </DialogTitle>
          <DialogDescription>
            Add funds to <span className="font-semibold text-foreground">{account.userName}</span>'s meal account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current balance</span>
              <span className={cn('font-semibold', balanceTone(account.balance))}>{formatMoney(account.balance)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount ($)</Label>
            <Input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25.00" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cash payment / online transfer…" />
          </div>
          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2">
            {['10', '20', '50', '100'].map((q) => (
              <Button key={q} type="button" size="sm" variant="outline" onClick={() => setAmount(q)}>
                ${q}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
            Add Funds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TransactionsDialog({ account, onClose }: { account: MealAccount; onClose: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [transactions, setTransactions] = useState<MealTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ transactions: MealTransaction[] }>('/api/meal-transactions', { query: { accountId: account.id } })
        if (!active) return
        setTransactions(res.transactions)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load transactions', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [account.id, addToast])

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" /> Transaction History
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{account.userName}</span> · Current balance{' '}
            <span className={cn('font-semibold', balanceTone(account.balance))}>{formatMoney(account.balance)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-8 w-8 opacity-40" />
              <p className="text-sm">No transactions yet.</p>
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {transactions.map((t) => <TransactionRow key={t.id} t={t} />)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 text-white hover:bg-emerald-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditPreferencesDialog({ account, onClose, onSaved }: { account: MealAccount; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [mealPlan, setMealPlan] = useState(account.mealPlan)
  const [tags, setTags] = useState<string[]>(account.dietaryTags)
  const [saving, setSaving] = useState(false)

  function toggleTag(t: string) {
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }

  async function save() {
    setSaving(true)
    try {
      await api(`/api/meal-accounts/${account.id}`, {
        method: 'PATCH',
        body: { mealPlan, dietaryTags: tags },
      })
      addToast({ type: 'success', title: 'Preferences updated', body: 'Your dietary preferences have been saved.' })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Salad className="h-4 w-4 text-emerald-600" /> Dietary Preferences
          </DialogTitle>
          <DialogDescription>Update your meal plan and dietary tags.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meal Plan</Label>
            <Select value={mealPlan} onValueChange={setMealPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEAL_PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dietary Tags</Label>
            <div className="grid grid-cols-2 gap-2">
              {DIETARY_TAGS.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm transition hover:bg-muted/50">
                  <Checkbox checked={tags.includes(t)} onCheckedChange={() => toggleTag(t)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
