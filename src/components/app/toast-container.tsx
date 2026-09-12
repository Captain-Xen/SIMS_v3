'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const config = {
  success: { icon: CheckCircle2, color: 'text-emerald-500', bar: 'bg-emerald-500' },
  error: { icon: XCircle, color: 'text-red-500', bar: 'bg-red-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bar: 'bg-amber-500' },
  info: { icon: Info, color: 'text-blue-500', bar: 'bg-blue-500' },
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex w-80 flex-col gap-3">
      {toasts.map((t) => {
        const c = config[t.type]
        const Icon = c.icon
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-2xl animate-fade-slide"
            onClick={() => removeToast(t.id)}
          >
            <div className="mt-0.5">
              <Icon className={cn('h-5 w-5', c.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-muted-foreground">{t.body}</p>}
            </div>
            <button className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); removeToast(t.id) }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
