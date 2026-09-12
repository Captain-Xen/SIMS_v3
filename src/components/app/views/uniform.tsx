'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Shirt, Plus, Package, Boxes, AlertTriangle, PackageCheck, Pencil, Trash2,
  X, Loader2, Send, ArrowRight, Check, ShoppingBag, Hash, Users, PackageOpen,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { UniformItem, UniformAllocation, Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '../user-avatar'
import { cn } from '@/lib/utils'

type UniformItemWithAllocated = UniformItem & { allocatedCount: number }

const CATEGORIES = ['Shirt', 'Pants', 'Skirt', 'Tie', 'Blazer', 'Socks', 'Shoes', 'General']

const CATEGORY_STYLES: Record<string, { badge: string; bar: string }> = {
  Shirt: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  Pants: {
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    bar: 'bg-teal-500',
  },
  Skirt: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    bar: 'bg-violet-500',
  },
  Tie: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    bar: 'bg-amber-500',
  },
  Blazer: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    bar: 'bg-cyan-500',
  },
  Socks: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    bar: 'bg-slate-500',
  },
  Shoes: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  General: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    bar: 'bg-slate-500',
  },
}

const STAFF_CAN_MANAGE = ['Admin', 'Principal']

function styleForCategory(cat: string) {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.General
}

const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)

function stockColor(stock: number): string {
  if (stock < 5) return 'text-rose-600 dark:text-rose-400'
  if (stock < 15) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function formatDate(date: string): string {
  try {
    const d = date.length === 10 ? new Date(date + 'T00:00:00') : new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

export function UniformView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [items, setItems] = useState<UniformItemWithAllocated[]>([])
  const [allocations, setAllocations] = useState<UniformAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<UniformItemWithAllocated | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [returning, setReturning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const isStudent = user.role === 'Student'
  const canManage = STAFF_CAN_MANAGE.includes(user.role)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [iRes, aRes] = await Promise.all([
          api<{ items: UniformItemWithAllocated[] }>('/api/uniform-items'),
          api<{ allocations: UniformAllocation[] }>('/api/uniform-allocations'),
        ])
        if (!active) return
        setItems(iRes.items)
        setAllocations(aRes.allocations)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load uniforms', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  async function reload() {
    try {
      const [iRes, aRes] = await Promise.all([
        api<{ items: UniformItemWithAllocated[] }>('/api/uniform-items'),
        api<{ allocations: UniformAllocation[] }>('/api/uniform-allocations'),
      ])
      setItems(iRes.items)
      setAllocations(aRes.allocations)
    } catch { /* ignore */ }
  }

  const stats = useMemo(() => {
    const totalStock = items.reduce((a, i) => a + i.stock, 0)
    const lowStock = items.filter((i) => i.stock < 10).length
    const allocated = allocations.filter((a) => a.status === 'Issued').length
    return {
      totalItems: items.length,
      totalStock,
      lowStock,
      allocated,
    }
  }, [items, allocations])

  async function deleteItem(item: UniformItemWithAllocated) {
    if (!confirm(`Delete "${item.name}"?`)) return
    setDeleting(item.id)
    try {
      await api(`/api/uniform-items/${item.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Item deleted', body: item.name })
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  async function returnAllocation(a: UniformAllocation) {
    setReturning(a.id)
    try {
      await api('/api/uniform-allocations', { method: 'PATCH', body: { id: a.id, status: 'Returned' } })
      addToast({ type: 'success', title: 'Uniform returned', body: `${a.uniformName} returned by ${a.userName}.` })
      await reload()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Return failed', body: e.message })
    } finally {
      setReturning(null)
    }
  }

  async function deleteAllocation(a: UniformAllocation) {
    if (!confirm(`Delete allocation for ${a.userName}?`)) return
    setDeleting(a.id)
    try {
      await api(`/api/uniform-allocations/${a.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Allocation deleted' })
      await reload()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  // ============ Student view ============
  if (isStudent) {
    return (
      <div className="space-y-6">
        <UniformHeader canManage={false} onAdd={() => {}} />

        {loading ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center p-0">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* My Uniforms */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PackageCheck className="h-4 w-4 text-emerald-600" /> My Uniforms
                  </CardTitle>
                  <CardDescription>Your issued uniform items</CardDescription>
                </CardHeader>
                <CardContent>
                  {allocations.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <PackageOpen className="h-10 w-10 opacity-40" />
                      <p className="text-xs">No uniforms issued to you yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allocations.map((a) => (
                        <div key={a.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{a.uniformName}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Size {a.size} · Qty {a.quantity}
                              </p>
                            </div>
                            <Badge variant={a.status === 'Issued' ? 'default' : 'secondary'} className={a.status === 'Issued' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}>
                              {a.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Issued {formatDate(a.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Catalog */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" /> Uniform Catalog
                  </CardTitle>
                  <CardDescription>Available uniform items</CardDescription>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <Package className="h-10 w-10 opacity-40" />
                      <p className="text-xs">No uniform items available.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((it) => {
                        const s = styleForCategory(it.category)
                        return (
                          <div key={it.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{it.name}</p>
                                <span className={cn('mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
                                  {it.category}
                                </span>
                              </div>
                              <p className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(it.price)}
                              </p>
                            </div>
                            {it.sizes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {it.sizes.map((sz) => (
                                  <span key={sz} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                    {sz}
                                  </span>
                                ))}
                              </div>
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
        )}
      </div>
    )
  }

  // ============ Staff view ============
  return (
    <div className="space-y-6">
      <UniformHeader canManage={canManage} onAdd={() => setAdding(true)} />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total Items" value={String(stats.totalItems)} sub="in catalog" color="emerald" />
        <StatCard icon={Boxes} label="Total Stock" value={String(stats.totalStock)} sub="units on hand" color="teal" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={String(stats.lowStock)} sub="items under 10" color={stats.lowStock > 0 ? 'red' : 'slate'} />
        <StatCard icon={PackageCheck} label="Allocated" value={String(stats.allocated)} sub="active issues" color="cyan" />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center p-0">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Uniform items grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-emerald-600" /> Uniform Items
              </h3>
              {canManage && (
                <Button size="sm" onClick={() => setIssuing(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <ArrowRight className="h-4 w-4" /> Issue Uniform
                </Button>
              )}
            </div>
            {items.length === 0 ? (
              <Card>
                <CardContent className="flex h-48 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
                  <Package className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No uniform items yet.</p>
                  {canManage && <p className="text-xs text-emerald-600">Click &ldquo;Add Item&rdquo; to create one.</p>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((it) => {
                  const s = styleForCategory(it.category)
                  return (
                    <Card key={it.id} className="overflow-hidden transition hover:shadow-md">
                      <div className={cn('h-1.5 w-full', s.bar)} />
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-semibold leading-snug">{it.name}</h3>
                            <span className={cn('mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
                              {it.category}
                            </span>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(it.price)}
                          </p>
                        </div>
                        {it.sizes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            {it.sizes.map((sz) => (
                              <span key={sz} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                {sz}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              Stock: <span className={cn('font-bold', stockColor(it.stock))}>{it.stock}</span>
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" /> {it.allocatedCount} issued
                            </span>
                          </div>
                        </div>
                        {it.stock < 5 && (
                          <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" /> Low stock — reorder soon
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {canManage && (
                            <Button size="sm" variant="outline" onClick={() => setIssuing(true)} disabled={it.stock === 0}>
                              <ArrowRight className="h-3.5 w-3.5" /> Issue
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => deleteItem(it)} disabled={deleting === it.id}>
                                {deleting === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Allocations table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-emerald-600" /> Uniform Allocations
              </CardTitle>
              <CardDescription>All issued and returned uniforms</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {allocations.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <PackageCheck className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No allocations yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Student</th>
                        <th className="hidden p-3 text-left font-medium sm:table-cell">Item</th>
                        <th className="p-3 text-left font-medium">Size</th>
                        <th className="p-3 text-left font-medium">Qty</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="hidden p-3 text-left font-medium md:table-cell">Date</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((a) => (
                        <tr key={a.id} className="border-b border-border transition hover:bg-muted/40">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={a.userName} role="Student" size="sm" />
                              <span className="font-medium">{a.userName}</span>
                            </div>
                          </td>
                          <td className="hidden p-3 sm:table-cell">{a.uniformName}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">{a.size}</Badge>
                          </td>
                          <td className="p-3 font-medium">{a.quantity}</td>
                          <td className="p-3">
                            <Badge variant={a.status === 'Issued' ? 'default' : 'secondary'} className={a.status === 'Issued' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="hidden p-3 text-xs text-muted-foreground md:table-cell">
                            {formatDate(a.date)}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              {a.status === 'Issued' && canManage && (
                                <Button size="sm" variant="outline" onClick={() => returnAllocation(a)} disabled={returning === a.id}>
                                  {returning === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  Return
                                </Button>
                              )}
                              {canManage && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700" onClick={() => deleteAllocation(a)} disabled={deleting === a.id}>
                                  {deleting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              )}
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
      )}

      {(adding || editing) && (
        <ItemDialog
          item={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); reload() }}
        />
      )}

      {issuing && (
        <IssueDialog
          items={items}
          onClose={() => setIssuing(false)}
          onSaved={() => { setIssuing(false); reload() }}
        />
      )}
    </div>
  )
}

function UniformHeader({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/20">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
      <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            <Shirt className="h-7 w-7" /> Uniform Management
          </h2>
          <p className="mt-1.5 text-sm text-emerald-50/85">
            Track uniform items, sizes, and student allocations.
          </p>
        </div>
        {canManage && (
          <Button onClick={onAdd} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <CardContent className="relative p-5">
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition group-hover:from-emerald-500/10 group-hover:to-teal-500/10" />
        <div className="relative flex items-center justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition group-hover:scale-110', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0" />
        </div>
        <p className="relative mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="relative text-xs font-medium text-muted-foreground">{label}</p>
        <p className="relative mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{sub}</p>
      </CardContent>
    </Card>
  )
}

function ItemDialog({ item, onClose, onSaved }: { item: UniformItemWithAllocated | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Shirt',
    sizes: (item?.sizes ?? []).join(', '),
    price: item ? (item.price / 100).toFixed(2) : '',
    stock: item ? String(item.stock) : '0',
  })

  async function save() {
    if (!form.name.trim()) {
      addToast({ type: 'warning', title: 'Missing name', body: 'Please enter an item name.' })
      return
    }
    const priceDollars = parseFloat(form.price || '0')
    if (!Number.isFinite(priceDollars) || priceDollars < 0) {
      addToast({ type: 'warning', title: 'Invalid price', body: 'Price must be a positive number.' })
      return
    }
    const stock = parseInt(form.stock || '0', 10)
    if (!Number.isFinite(stock) || stock < 0) {
      addToast({ type: 'warning', title: 'Invalid stock', body: 'Stock must be a non-negative integer.' })
      return
    }
    const sizes = form.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        category: form.category,
        sizes,
        price: Math.round(priceDollars * 100),
        stock,
      }
      if (item) {
        await api(`/api/uniform-items/${item.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Item updated', body: form.name.trim() })
      } else {
        await api('/api/uniform-items', { method: 'POST', body })
        addToast({ type: 'success', title: 'Item added', body: form.name.trim() })
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" /> {item ? 'Edit Item' : 'Add Item'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. White Polo Shirt" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sizes (comma-separated)</Label>
            <Input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="e.g. S, M, L, XL" />
            <p className="text-[11px] text-muted-foreground">Separate each size with a comma.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price (USD)</Label>
              <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stock</Label>
              <Input type="number" min={0} step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IssueDialog({ items, onClose, onSaved }: { items: UniformItemWithAllocated[]; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [uniformId, setUniformId] = useState('')
  const [userId, setUserId] = useState('')
  const [size, setSize] = useState('')
  const [quantity, setQuantity] = useState('1')

  useEffect(() => {
    let active = true
    async function load() {
      setLoadingStudents(true)
      try {
        const res = await api<{ students: Student[] }>('/api/students')
        if (!active) return
        setStudents(res.students)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load students', body: e.message })
      } finally {
        if (active) setLoadingStudents(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const selectedItem = items.find((i) => i.id === uniformId)
  const availableSizes = selectedItem?.sizes ?? []
  // Derive the effective size: if user hasn't picked one (or picked an invalid one for the current item),
  // fall back to the first available size. Avoids the need for a setState-in-effect.
  const effectiveSize = availableSizes.includes(size) ? size : (availableSizes[0] ?? '')
  const maxQty = selectedItem?.stock ?? 1

  async function issue() {
    if (!uniformId || !userId) {
      addToast({ type: 'warning', title: 'Missing fields', body: 'Please select an item and a student.' })
      return
    }
    const qty = parseInt(quantity || '1', 10)
    if (!Number.isFinite(qty) || qty < 1) {
      addToast({ type: 'warning', title: 'Invalid quantity', body: 'Quantity must be at least 1.' })
      return
    }
    if (selectedItem && qty > selectedItem.stock) {
      addToast({ type: 'warning', title: 'Insufficient stock', body: `Only ${selectedItem.stock} available.` })
      return
    }
    setSaving(true)
    try {
      await api('/api/uniform-allocations', {
        method: 'POST',
        body: { uniformId, userId, size: effectiveSize || 'Standard', quantity: qty },
      })
      addToast({ type: 'success', title: 'Uniform issued', body: `${selectedItem?.name ?? 'Item'} issued successfully.` })
      onSaved()
    } catch (e: any) {
      addToast({ type: 'error', title: 'Issue failed', body: e.message })
    } finally {
      setSaving(false)
    }
  }

  const inStockItems = items.filter((i) => i.stock > 0)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-emerald-600" /> Issue Uniform
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Uniform Item *</Label>
            <Select value={uniformId} onValueChange={(v) => { setUniformId(v); setSize('') }}>
              <SelectTrigger><SelectValue placeholder="Select an item…" /></SelectTrigger>
              <SelectContent>
                {inStockItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.stock} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {items.length > 0 && inStockItems.length === 0 && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">All items are out of stock.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Student *</Label>
            {loadingStudents ? (
              <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading students…
              </div>
            ) : (
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue placeholder="Select a student…" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Size</Label>
              {availableSizes.length > 0 ? (
                <Select value={effectiveSize} onValueChange={setSize}>
                  <SelectTrigger><SelectValue placeholder="Select size…" /></SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((sz) => (
                      <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value="Standard" disabled />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</Label>
              <Input type="number" min={1} max={maxQty} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              {selectedItem && (
                <p className="text-[11px] text-muted-foreground">Max: {maxQty}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={issue} disabled={saving || !uniformId || !userId} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Issue Uniform
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
