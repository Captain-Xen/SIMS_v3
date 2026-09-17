'use client'

import { useMemo } from 'react'
import { CalendarClock, Coffee } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const SLOTS: { time: string; label?: string; isBreak?: boolean }[] = [
  { time: '08:00 – 09:00' },
  { time: '09:00 – 10:00' },
  { time: '10:00 – 11:00' },
  { time: '11:00 – 11:45' },
  { time: '11:45 – 12:30', isBreak: true, label: 'Lunch Break' },
  { time: '12:30 – 13:30' },
  { time: '13:30 – 14:30' },
]

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: 'bg-brand/10 text-brand-strong border-brand/25 dark:bg-brand/12 dark:text-brand dark:border-brand/30',
  English: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-900',
  Biology: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-950/40 dark:text-lime-200 dark:border-lime-900',
  History: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  Physics: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-900',
  Spanish: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
  Chemistry: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900',
  French: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-900',
  Geography: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900',
  'Information Technology': 'bg-brand/10 text-brand-strong border-brand/25 dark:bg-brand/12 dark:text-brand dark:border-brand/30',
  'Principles of Business': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  'Principles of Accounts': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-900',
  'Physical Education': 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-950/40 dark:text-lime-200 dark:border-lime-900',
  'Visual Arts': 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
}

function colorFor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:border-slate-700'
}

// Deterministic pseudo-random based on string seed
function seedHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}

export function TimetableView() {
  const user = useAppStore((s) => s.user)!

  const subjects = useMemo<string[]>(() => {
    if (user.role === 'Student') {
      return ['Mathematics', 'English', 'Biology', 'History', 'Physics', 'Spanish']
    }
    try {
      const parsed = JSON.parse(user.subjects ?? '[]') as string[]
      if (parsed.length > 0) return parsed
    } catch { /* ignore */ }
    return ['Mathematics', 'Physics', 'Chemistry']
  }, [user])

  // Build deterministic schedule: for each (day, slot) pick a subject
  const schedule = useMemo(() => {
    const grid: (string | null)[][] = [] // [slotIndex][dayIndex]
    const seedBase = user.id + '|' + subjects.join(',')
    for (let s = 0; s < SLOTS.length; s++) {
      const row: (string | null)[] = []
      for (let d = 0; d < DAYS.length; d++) {
        if (SLOTS[s].isBreak) { row.push(null); continue }
        // Deterministic subject pick
        const h = seedHash(`${seedBase}|${d}|${s}`)
        // Skip ~10% of slots (study/free)
        const isFree = h % 10 === 0
        if (isFree) { row.push(null); continue }
        row.push(subjects[h % subjects.length])
      }
      grid.push(row)
    }
    return grid
  }, [user, subjects])

  const uniqueSubjects = Array.from(new Set(schedule.flat().filter(Boolean) as string[]))

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-xl shadow-brand/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 right-1/3 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <CardContent className="relative flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"><CalendarClock className="h-7 w-7" /> Weekly Timetable</h2>
            <p className="mt-1.5 text-sm text-brand-foreground/85">
              {user.role === 'Student' ? 'Your class schedule' : `Teaching schedule for ${user.name.split(' ')[0]}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm backdrop-blur ring-1 ring-white/20">
            <CalendarClock className="h-4 w-4" />
            <span>Monday – Friday</span>
          </div>
        </CardContent>
      </Card>

      {/* Subject legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subjects this week</CardTitle>
          <CardDescription>{uniqueSubjects.length} subjects scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {uniqueSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects scheduled.</p>
            ) : (
              uniqueSubjects.map((s) => (
                <span key={s} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium', colorFor(s))}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {s}
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timetable grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 p-2 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-32 bg-card p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="p-3 text-center">
                      <div className="hidden font-semibold sm:block">{d}</div>
                      <div className="font-semibold sm:hidden">{DAYS_SHORT[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot, sIdx) => (
                  <tr key={sIdx}>
                    <td className={cn(
                      'sticky left-0 z-10 w-32 rounded-lg p-3 text-xs font-medium',
                      slot.isBreak ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-muted/60 text-muted-foreground',
                    )}>
                      <div className="flex items-center gap-1.5">
                        {slot.isBreak && <Coffee className="h-3.5 w-3.5" />}
                        <span>{slot.time}</span>
                      </div>
                      {slot.isBreak && <div className="mt-0.5 text-[10px] uppercase">{slot.label}</div>}
                    </td>
                    {DAYS.map((_, dIdx) => {
                      const subj = schedule[sIdx][dIdx]
                      if (slot.isBreak) {
                        return (
                          <td key={dIdx} className="rounded-lg bg-amber-50 p-3 text-center align-middle dark:bg-amber-950/20">
                            <div className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                              <Coffee className="h-4 w-4" />
                              <span className="hidden sm:inline">Lunch</span>
                            </div>
                          </td>
                        )
                      }
                      if (!subj) {
                        return (
                          <td key={dIdx} className="rounded-lg border border-dashed border-border p-3 text-center align-middle text-xs text-muted-foreground">
                            Free
                          </td>
                        )
                      }
                      return (
                        <td key={dIdx} className="p-1.5 align-middle">
                          <div className={cn('flex h-full min-h-[60px] flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition hover:shadow-sm', colorFor(subj))}>
                            <p className="text-xs font-semibold leading-tight sm:text-sm">{subj}</p>
                            <p className="mt-0.5 hidden text-[10px] opacity-70 sm:block">{user.role === 'Student' ? user.className ?? 'Class' : 'Room ' + ((sIdx + dIdx) % 8 + 101)}</p>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
