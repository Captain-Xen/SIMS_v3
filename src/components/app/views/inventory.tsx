'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PackageOpen, Plus, Search, Pencil, Trash2, Download, AlertTriangle, ArrowUp,
  ArrowDown, Loader2, X, Send, Package, Boxes, MapPin, Filter, ArrowRight,
} from 'lucide-react'
import { api, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { InventoryItem } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Equipment', 'Furniture', 'Lab Supply', 'Textbook', 'Stationery', 'General'] as const
const UNITS = ['pcs', 'boxes', 'sets', 'books'] as const
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor'] as const

const CATEGORY_STYLES: Record<string, string> = {
  Equipment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Furniture: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  'Lab Supply': 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Textbook: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  Stationery: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  General: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

const CONDITION_STYLES: Record<string, string> = {
  New: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  Good: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  Fair: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  Poor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

function catStyle(c: string) { return CATEGORY_STYLES[c] ?? CATEGORY_STYLES.General }
function condStyle(c: string) { return CONDITION_STYLES[c] ?? CONDITION_STYLES.Fair }

export function InventoryView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ items: InventoryItem[] }>('/api/inventory')
        if (!active) return
        setItems(res.items)
      } catch (e: any) {
        if (active) addToast({ type: 'error', title: 'Failed to load inventory', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const stats = useMemo(() => {
    const totalItems = items.length
    const lowStock = items.filter((i) => i.quantity <= i.minStock).length
    const categories = new Set(items.map((i) => i.category)).size
    const totalUnits = items.reduce((a, i) => a + i.quantity, 0)
    return { totalItems, lowStock, categories, totalUnits }
  }, [items])

  const lowStockItems = useMemo(() => {
    return items
      .filter((i) => i.quantity <= i.minStock)
      .sort((a, b) => a.quantity - b.quantity)
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (category !== 'all' && i.category !== category) return false
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        (i.location ?? '').toLowerCase().includes(q) ||
        (i.notes ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, search, category])

  async function adjustQty(item: InventoryItem, delta: number) {
    const newQty = Math.max(0, item.quantity + delta)
    if (newQty === item.quantity) return
    setAdjusting(item.id)
    try {
      await api(`/api/inventory/${item.id}`, { method: 'PATCH', body: { quantity: newQty } })
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: newQty, updatedAt: new Date().toISOString() } : i))
      addToast({
        type: 'success',
        title: delta > 0 ? 'Quantity increased' : 'Quantity decreased',
        body: `${item.name}: ${item.quantity} → ${newQty} ${item.unit}`,
      })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Adjust failed', body: e.message })
    } finally {
      setAdjusting(null)
    }
  }

  async function removeItem(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    setDeleting(item.id)
    try {
      await api(`/api/inventory/${item.id}`, { method: 'DELETE' })
      addToast({ type: 'success', title: 'Item deleted', body: `"${item.name}" removed from inventory.` })
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete failed', body: e.message })
    } finally {
      setDeleting(null)
    }
  }

  function onSaved() {
    setAdding(false)
    setEditing(null)
    ;(async () => {
      try {
        const res = await api<{ items: InventoryItem[] }>('/api/inventory')
        setItems(res.items)
      } catch { /* ignore */ }
    })()
  }

  function exportCSV() {
    const headers = ['name', 'category', 'quantity', 'unit', 'condition', 'location', 'min_stock', 'notes', 'updated_at']
    const rows = filtered.map((i) => [
      i.name, i.category, i.quantity, i.unit, i.condition, i.location ?? '',
      i.minStock, (i.notes ?? '').replace(/\n/g, ' '), i.updatedAt,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', title: 'Exported', body: `${filtered.length} item(s) exported to CSV.` })
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
              <PackageOpen className="h-7 w-7" /> Inventory
            </h2>
            <p className="mt-1.5 text-sm text-emerald-50/85">
              Track school equipment, lab supplies, textbooks, and furniture.
            </p>
          </div>
          <Button onClick={() => setAdding(true)} variant="secondary" className="shrink-0 border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Total Items" value={String(stats.totalItems)} sub={`${stats.totalUnits} units`} color="emerald" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={String(stats.lowStock)} sub={stats.lowStock > 0 ? 'needs reorder' : 'all good'} color={stats.lowStock > 0 ? 'amber' : 'teal'} />
        <StatCard icon={Package} label="Categories" value={String(stats.categories)} sub="distinct types" color="cyan" />
        <StatCard icon={ArrowRight} label="Total Value (mock)" value={String(stats.totalUnits)} sub="cumulative units" color="teal" />
      </div>

      {/* Low stock alert */}
      {!loading && lowStockItems.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Low Stock Alert — {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} at or below minimum
                </h3>
                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/80">
                  Consider reordering these supplies to avoid running out.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lowStockItems.slice(0, 8).map((i) => (
                    <span
                      key={i.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                    >
                      <span className="truncate max-w-[160px]">{i.name}</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {i.quantity}/{i.minStock} {i.unit}
                      </span>
                    </span>
                  ))}
                  {lowStockItems.length > 8 && (
                    <span className="inline-flex items-center rounded-md bg-amber-200/70 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
                      +{lowStockItems.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or notes…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full lg:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <PackageOpen className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                {search || category !== 'all' ? 'No items match your filters.' : 'No inventory items yet.'}
              </p>
              <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Item</th>
                    <th className="hidden p-3 text-left font-medium sm:table-cell">Category</th>
                    <th className="p-3 text-left font-medium">Quantity</th>
                    <th className="hidden p-3 text-left font-medium md:table-cell">Condition</th>
                    <th className="hidden p-3 text-left font-medium lg:table-cell">Location</th>
                    <th className="p-3 text-left font-medium">Min Stock</th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => {
                    const low = i.quantity <= i.minStock
                    const isAdjusting = adjusting === i.id
                    return (
                      <tr key={i.id} className="border-b border-border transition hover:bg-muted/40">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{i.name}</span>
                            {i.notes && (
                              <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{i.notes}</span>
                            )}
                            <span className="mt-0.5 text-[10px] text-muted-foreground">Updated {timeAgo(i.updatedAt)}</span>
                          </div>
                        </td>
                        <td className="hidden p-3 sm:table-cell">
                          <span className={cn('inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold', catStyle(i.category))}>
                            {i.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isAdjusting || i.quantity === 0}
                              onClick={() => adjustQty(i, -1)}
                              title="Decrease"
                            >
                              {isAdjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDown className="h-3.5 w-3.5" />}
                            </Button>
                            <span className={cn(
                              'min-w-[60px] rounded-md px-2 py-1 text-center font-mono text-sm font-semibold',
                              low
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                            )}>
                              {i.quantity} <span className="text-[10px] font-normal opacity-70">{i.unit}</span>
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isAdjusting}
                              onClick={() => adjustQty(i, +1)}
                              title="Increase"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="hidden p-3 md:table-cell">
                          <span className={cn('inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold', condStyle(i.condition))}>
                            {i.condition}
                          </span>
                        </td>
                        <td className="hidden p-3 lg:table-cell">
                          {i.location ? (
                            <span className="flex items-center gap-1 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {i.location}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {low ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" title={`Below minimum stock (${i.minStock})`}>
                              <AlertTriangle className="h-3 w-3" />
                              {i.minStock} {i.unit}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{i.minStock} {i.unit}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => setEditing(i)}
                            >
                              <Pencil className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              title="Delete"
                              disabled={deleting === i.id}
                              onClick={() => removeItem(i)}
                            >
                              {deleting === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {(adding || editing) && (
        <ItemDialog
          item={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={onSaved}
        />
      )}
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

function ItemDialog({ item, onClose, onSaved }: { item: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const addToast = useAppStore((s) => s.addToast)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<string>(item?.category ?? 'Equipment')
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1))
  const [unit, setUnit] = useState<string>(item?.unit ?? 'pcs')
  const [condition, setCondition] = useState<string>(item?.condition ?? 'Good')
  const [location, setLocation] = useState(item?.location ?? '')
  const [minStock, setMinStock] = useState(String(item?.minStock ?? 0))
  const [notes, setNotes] = useState(item?.notes ?? '')

  async function save() {
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Name required', body: 'Please enter the item name.' })
      return
    }
    const q = Number(quantity)
    const ms = Number(minStock)
    if (!Number.isFinite(q) || q < 0) {
      addToast({ type: 'warning', title: 'Invalid quantity', body: 'Quantity must be a non-negative number.' })
      return
    }
    if (!Number.isFinite(ms) || ms < 0) {
      addToast({ type: 'warning', title: 'Invalid min stock', body: 'Min stock must be a non-negative number.' })
      return
    }
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        category,
        quantity: q,
        unit,
        condition,
        location: location.trim() || null,
        minStock: ms,
        notes: notes.trim() || null,
      }
      if (item) {
        await api(`/api/inventory/${item.id}`, { method: 'PATCH', body })
        addToast({ type: 'success', title: 'Item updated', body: `"${name.trim()}" has been saved.` })
      } else {
        await api('/api/inventory', { method: 'POST', body })
        addToast({ type: 'success', title: 'Item added', body: `"${name.trim()}" added to inventory.` })
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
            <PackageOpen className="h-4 w-4 text-emerald-600" />
            {item ? 'Edit Item' : 'Add Inventory Item'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell Latitude Laptop" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</Label>
              <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Min Stock</Label>
              <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lab 2 — Shelf A" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes (model, serial, supplier, etc.)" rows={3} />
          </div>
        </div>
        <Separator />
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
