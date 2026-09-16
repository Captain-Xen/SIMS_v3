'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Camera, Mail, Phone, IdCard, GraduationCap, BookOpen, Award, Target, TrendingUp,
  Pencil, FileDown, Save, X, Trash2, Loader2, MapPin, Briefcase, Calendar, Droplet, Users2, ShieldCheck, Star,
} from 'lucide-react'
import { api, resizeImageToDataUrl, gradeToForm, scoreToLetter, timeAgo } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser, Grade, Assignment } from '@/lib/types'
import { UserAvatar } from '../user-avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export function ProfileView() {
  const user = useAppStore((s) => s.user)!
  const setUser = useAppStore((s) => s.setUser)
  const setSettings = useAppStore((s) => s.setSettings)
  const addToast = useAppStore((s) => s.addToast)
  const viewUserId = useAppStore((s) => s.viewUserId)

  const [profile, setProfile] = useState<SessionUser | null>(null)
  const [grades, setGrades] = useState<Grade[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: user.name, bio: user.bio ?? '', phone: user.phone ?? '' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isOwn = !viewUserId || viewUserId === user.id
  const targetId = viewUserId ?? user.id

  useEffect(() => {
    let active = true
    async function load() {
      if (isOwn) {
        setProfile(user)
        setEditForm({ name: user.name, bio: user.bio ?? '', phone: user.phone ?? '' })
      } else {
        try {
          const res = await api<{ results: any[] }>('/api/search', { query: { q: targetId } })
          // search by id may not match; fetch staff/students lists instead
        } catch { /* ignore */ }
        // load from students/staff
        try {
          const [sRes, stRes] = await Promise.all([api<{ students: any[] }>('/api/students'), api<{ staff: any[] }>('/api/staff')])
          const found = sRes.students.find((s) => s.id === targetId) || stRes.staff.find((s) => s.id === targetId)
          if (found && active) {
            setProfile({
              id: found.id, name: found.name, email: found.email, role: found.role, status: found.status,
              avatar: found.avatar, bio: found.bio ?? null, phone: found.phone ?? null,
              grade: found.grade ?? null, className: found.className ?? null,
              department: found.department ?? null, subjects: found.subjects ?? null,
              points: found.points ?? 0, level: found.level ?? 1, badges: found.badges ?? 0,
            })
          }
        } catch { /* ignore */ }
      }
      if (active && (profile?.role === 'Student' || (!isOwn && profile?.role === 'Student'))) {
        try {
          const gRes = await api<{ grades: Grade[] }>('/api/grades', { query: { studentId: targetId } })
          if (active) setGrades(gRes.grades)
        } catch { /* ignore */ }
      }
      try {
        const aRes = await api<{ assignments: Assignment[] }>('/api/assignments')
        if (active) setAssignments(aRes.assignments)
      } catch { /* ignore */ }
    }
    load()
    return () => { active = false }
  }, [viewUserId, user.id])

  async function handlePicture(file: File) {
    if (!isOwn) return
    setUploading(true)
    try {
      // Downscale client-side so the stored avatar stays a small data URL.
      const dataUrl = await resizeImageToDataUrl(file, 256, 0.9)
      const res = await api<{ avatar: string }>('/api/upload', { method: 'POST', body: { dataUrl } })
      setUser({ ...user, avatar: res.avatar })
      setProfile({ ...profile!, avatar: res.avatar })
      addToast({ type: 'success', title: 'Picture updated', body: 'Your profile photo has been changed.' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Upload failed', body: e.message })
    } finally {
      setUploading(false)
    }
  }

  async function removePicture() {
    if (!isOwn) return
    setUploading(true)
    try {
      await api('/api/upload', { method: 'DELETE', body: {} })
      setUser({ ...user, avatar: null })
      setProfile({ ...profile!, avatar: null })
      addToast({ type: 'info', title: 'Picture removed', body: 'Reverted to default user icon.' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Could not remove', body: e.message })
    } finally {
      setUploading(false)
    }
  }

  async function saveProfile() {
    try {
      const res = await api<{ user: SessionUser }>('/api/profile', { method: 'PATCH', body: editForm })
      setUser(res.user)
      setProfile(res.user)
      setEditing(false)
      addToast({ type: 'success', title: 'Profile saved' })
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', body: e.message })
    }
  }

  function downloadReportCard() {
    if (!profile) return
    const win = window.open('', '_blank')
    if (!win) return
    const schoolName = useAppStore.getState().settings?.name || 'EduCenterJM'
    const subjects = grades.length ? grades : [
      { subject: 'Mathematics', score: 85 },
      { subject: 'English Language', score: 78 },
      { subject: 'Biology', score: 92 },
      { subject: 'History', score: 81 },
    ]
    const rows = subjects.map((g: any) => `
      <tr>
        <td style="padding:8px;border:1px solid #ccc">${g.subject}</td>
        <td style="padding:8px;border:1px solid #ccc;text-align:center">${g.score}%</td>
        <td style="padding:8px;border:1px solid #ccc;text-align:center">${scoreToLetter(g.score)}</td>
      </tr>`).join('')
    win.document.write(`
      <html><head><title>Report Card - ${profile.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#1e293b}h1{color:var(--brand)}</style>
      </head><body>
      <h1>${schoolName}</h1>
      <h2>Semester Report Card</h2>
      <p><strong>Student:</strong> ${profile.name}<br>
      <strong>ID:</strong> ${profile.id.slice(-8)}<br>
      <strong>Form:</strong> ${gradeToForm(profile.grade)} (${profile.className})<br>
      <strong>Term:</strong> Term 1</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px">
        <thead><tr style="background:#f0fdf4">
          <th style="padding:8px;border:1px solid #ccc;text-align:left">Subject</th>
          <th style="padding:8px;border:1px solid #ccc">Score</th>
          <th style="padding:8px;border:1px solid #ccc">Grade</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#64748b;font-size:12px">Generated on ${new Date().toLocaleDateString()}</p>
      </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isStudent = profile.role === 'Student'
  const mySubjects = profile.subjects ? safeParse(profile.subjects) : []
  const avgScore = grades.length ? Math.round(grades.reduce((a, g) => a + g.score, 0) / grades.length) : null
  const pointsToNext = 250
  const progress = Math.min(100, (profile.points / pointsToNext) * 100)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header card with avatar + picture upload */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-32 bg-gradient-to-r from-brand via-brand/70 to-brand-strong" />
        <CardContent className="relative px-6 pb-6">
          <div className="-mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <div className="relative group">
              <UserAvatar name={profile.name} avatar={profile.avatar} role={profile.role} size="2xl" className="border-4 border-card" />
              {isOwn && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-brand text-brand-foreground shadow-lg transition hover:bg-brand-strong disabled:opacity-60"
                    title="Upload profile picture"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePicture(f); e.target.value = '' }}
                  />
                </>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-bold">{profile.name}</h2>
                <Badge className={isStudent ? 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand' : 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'}>
                  {profile.role}
                </Badge>
                {profile.status !== 'Active' && <Badge variant="destructive">{profile.status}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isStudent ? `${gradeToForm(profile.grade)} · ${profile.className ?? '-'}` : profile.department ?? profile.role}
              </p>
            </div>
            <div className="flex gap-2 pb-2">
              {isOwn && (
                <>
                  {editing ? (
                    <>
                      <Button onClick={saveProfile} size="sm" className="bg-brand text-brand-foreground hover:bg-brand-strong"><Save className="h-4 w-4" /> Save</Button>
                      <Button onClick={() => { setEditing(false); setEditForm({ name: user.name, bio: user.bio ?? '', phone: user.phone ?? '' }) }} size="sm" variant="outline"><X className="h-4 w-4" /> Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)} size="sm" variant="outline"><Pencil className="h-4 w-4" /> Edit Profile</Button>
                  )}
                  {isStudent && <Button onClick={downloadReportCard} size="sm" variant="outline"><FileDown className="h-4 w-4" /> Report Card</Button>}
                </>
              )}
            </div>
          </div>

          {isOwn && profile.avatar && (
            <div className="mt-2 flex justify-end">
              <Button onClick={removePicture} variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" /> Remove picture
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="goals">Growth</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editing && isOwn ? (
                  <>
                    <Field label="Full Name"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
                    <Field label="Phone"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
                    <Field label="Bio"><Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} /></Field>
                  </>
                ) : (
                  <>
                    <InfoRow icon={Mail} label="Email" value={profile.email} />
                    <InfoRow icon={Phone} label="Phone" value={profile.phone ?? '—'} />
                    <InfoRow icon={IdCard} label="User ID" value={profile.id.slice(-8).toUpperCase()} />
                    {isStudent ? (
                      <>
                        <InfoRow icon={GraduationCap} label="Form" value={gradeToForm(profile.grade)} />
                        <InfoRow icon={Users2} label="Class" value={profile.className ?? '—'} />
                      </>
                    ) : (
                      <InfoRow icon={Briefcase} label="Department" value={profile.department ?? '—'} />
                    )}
                    <div className="pt-1">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</p>
                      <p className="text-sm">{profile.bio ?? 'No bio added yet.'}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Gamification</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"><Star className="h-6 w-6" /></div>
                    <div>
                      <p className="text-2xl font-bold">{profile.points}</p>
                      <p className="text-xs text-muted-foreground">Points · Level {profile.level}</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    <Award className="mr-1 h-3.5 w-3.5" /> {profile.badges} Badges
                  </Badge>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Level {profile.level}</span>
                    <span>{profile.points}/{pointsToNext} pts</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">{pointsToNext - profile.points} points to Level {profile.level + 1}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic */}
        <TabsContent value="academic" className="space-y-4">
          {isStudent ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={TrendingUp} label="Average Score" value={avgScore ? `${avgScore}%` : '—'} color="emerald" />
                <StatCard icon={BookOpen} label="Subjects" value={String(grades.length || 3)} color="teal" />
                <StatCard icon={Award} label="Top Grade" value={grades.length ? scoreToLetter(Math.max(...grades.map((g) => g.score))) : '—'} color="amber" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">My Grades</CardTitle><CardDescription>Term 1 results</CardDescription></CardHeader>
                <CardContent>
                  {grades.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No grades recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {grades.map((g) => (
                        <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 font-bold text-brand-strong dark:bg-brand/15 dark:text-brand">{g.score}%</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{g.subject}</p>
                            <p className="text-xs text-muted-foreground">{g.term}</p>
                          </div>
                          <Badge variant="outline" className={cn('font-bold', g.score >= 80 ? 'text-brand' : g.score >= 60 ? 'text-amber-600' : 'text-red-600')}>{scoreToLetter(g.score)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Subjects & Classes</CardTitle><CardDescription>Classes you teach</CardDescription></CardHeader>
              <CardContent>
                {mySubjects.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No subjects assigned yet.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mySubjects.map((s: string) => (
                      <div key={s} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><BookOpen className="h-5 w-5" /></div>
                        <div>
                          <p className="text-sm font-medium">{s}</p>
                          <p className="text-xs text-muted-foreground">Multiple classes</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Assignments</CardTitle></CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><FileDown className="h-4 w-4" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.subject} · due {a.dueDate}</p>
                      </div>
                      {a.submissionStatus ? <Badge variant="outline" className={a.submissionStatus === 'Graded' ? 'text-brand' : 'text-amber-600'}>{a.submissionStatus}</Badge> : <Badge variant="outline">Pending</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth */}
        <TabsContent value="goals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Growth Goals</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <GoalRow label={isStudent ? 'Achieve 90%+ in Mathematics' : 'Complete curriculum on time'} progress={75} />
                <GoalRow label={isStudent ? 'Submit all assignments early' : 'Grade all submissions within 3 days'} progress={60} />
                <GoalRow label={isStudent ? 'Attend every class this term' : 'Hold weekly parent-teacher check-ins'} progress={90} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Badges Earned</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {['First Login', 'Quiz Master', 'Helpful Peer', 'Perfect Week', 'Bookworm', 'Team Player'].slice(0, Math.max(1, profile.badges + 1)).map((b, i) => (
                    <div key={b} className="flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-center">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', i < profile.badges ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : 'bg-muted text-muted-foreground')}><Award className="h-5 w-5" /></div>
                      <p className="text-[10px] font-medium">{b}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function safeParse(s: string): string[] {
  try { return JSON.parse(s) } catch { return [] }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      <span className="flex-1 text-sm font-medium">{value}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-brand/10 text-brand-strong dark:bg-brand/15 dark:text-brand',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', colors[color])}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function GoalRow({ label, progress }: { label: string; progress: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  )
}
