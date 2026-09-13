'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Users, ChevronRight, Loader2, Layers } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { Student } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B']

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: 'bg-brand',
  English: 'bg-teal-500',
  Biology: 'bg-lime-500',
  History: 'bg-amber-500',
  Physics: 'bg-cyan-500',
  Spanish: 'bg-rose-500',
  Chemistry: 'bg-violet-500',
  French: 'bg-pink-500',
  Geography: 'bg-orange-500',
  'Information Technology': 'bg-brand',
  'Principles of Business': 'bg-amber-600',
  'Principles of Accounts': 'bg-teal-600',
  'Physical Education': 'bg-lime-600',
  'Visual Arts': 'bg-rose-600',
}

function colorDot(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'bg-slate-500'
}

function seedHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h)
}

export function SubjectsView() {
  const user = useAppStore((s) => s.user)!
  const addToast = useAppStore((s) => s.addToast)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const subjects = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(user.subjects ?? '[]') as string[]
      if (parsed.length > 0) return parsed
    } catch { /* ignore */ }
    return ['Mathematics', 'Physics', 'Chemistry']
  }, [user])

  // 3 classes per subject, deterministic
  const subjectClasses = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const subj of subjects) {
      const seed = seedHash(`${user.id}|${subj}`)
      const picks: string[] = []
      for (let i = 0; i < 3; i++) {
        picks.push(CLASSES[(seed + i * 4) % CLASSES.length])
      }
      map.set(subj, Array.from(new Set(picks)).slice(0, 3))
    }
    return map
  }, [user, subjects])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await api<{ students: Student[] }>('/api/students')
        if (!active) return
        setStudents(res.students)
      } catch (e: any) {
        addToast({ type: 'error', title: 'Failed to load students', body: e.message })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [addToast])

  const classStudentCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students) map.set(s.className ?? '?', (map.get(s.className ?? '?') ?? 0) + 1)
    return map
  }, [students])

  const totalStudents = useMemo(() => {
    const set = new Set<string>()
    for (const subj of subjects) {
      for (const cls of subjectClasses.get(subj) ?? []) {
        for (const s of students) {
          if (s.className === cls) set.add(s.id)
        }
      }
    }
    return set.size
  }, [students, subjects, subjectClasses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-brand via-brand/70 to-brand-strong text-brand-foreground shadow-lg">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">My Subjects</h2>
            <p className="mt-1 text-sm text-brand-foreground/80">Subjects you teach and the classes assigned to each</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{subjects.length}</p>
              <p className="text-xs text-brand-foreground/80">Subjects</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
              <p className="text-2xl font-bold">{subjects.length * 3}</p>
              <p className="text-xs text-brand-foreground/80">Class sections</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand"><BookOpen className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{subjects.length}</p><p className="text-xs text-muted-foreground">Subjects</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><Layers className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{subjects.length * 3}</p><p className="text-xs text-muted-foreground">Class sections</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300"><Users className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Students taught</p></div></CardContent></Card>
      </div>

      {/* Subject cards */}
      {loading ? (
        <Card><CardContent className="flex h-64 items-center justify-center p-0"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-2 p-0 text-muted-foreground">
            <BookOpen className="h-10 w-10 opacity-40" />
            <p className="text-sm">No subjects assigned. Update your profile to add subjects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((subj) => {
            const classes = subjectClasses.get(subj) ?? []
            const studentCount = classes.reduce((sum, c) => sum + (classStudentCounts.get(c) ?? 0), 0)
            return (
              <Card key={subj} className="transition hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', colorDot(subj))}>
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{subj}</CardTitle>
                      <CardDescription>{classes.length} classes · {studentCount} students</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveView('grades')}>
                    Grades <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {classes.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveView('grades')}
                      className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition hover:border-brand/35 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 font-bold text-brand-strong dark:bg-brand/15 dark:text-brand">{c}</div>
                        <div>
                          <p className="text-sm font-medium">Class {c}</p>
                          <p className="text-xs text-muted-foreground">{classStudentCounts.get(c) ?? 0} students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-brand">View grades</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
