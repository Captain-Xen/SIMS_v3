'use client'

import { useState } from 'react'
import { GraduationCap, Moon, Sun, LogIn, UserPlus, KeyRound, ArrowLeft, Loader2, Mail, Lock, User, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import type { SessionUser } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'forgot'
type Portal = 'Staff' | 'Student'

const demoAccounts = [
  { label: 'Admin', email: 'admin@edu.edu', password: 'admin123', portal: 'Staff' as Portal },
  { label: 'Teacher', email: 'staff@edu.edu', password: 'staff123', portal: 'Staff' as Portal },
  { label: 'Student', email: 'student@edu.edu', password: 'student123', portal: 'Student' as Portal },
]

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser)
  const addToast = useAppStore((s) => s.addToast)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const settings = useAppStore((s) => s.settings)

  const [mode, setMode] = useState<Mode>('login')
  const [portal, setPortal] = useState<Portal>('Staff')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Student' as 'Student' | 'Teacher' })
  const [forgotEmail, setForgotEmail] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api<{ user: SessionUser }>('/api/auth/login', { method: 'POST', body: { email: form.email, password: form.password } })
      setUser(res.user)
      addToast({ type: 'success', title: `Welcome back, ${res.user.name.split(' ')[0]}!`, body: `Signed in as ${res.user.role}.` })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sign in failed', body: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api<{ user: SessionUser }>('/api/auth/register', { method: 'POST', body: form })
      setUser(res.user)
      addToast({ type: 'success', title: 'Account created!', body: `Welcome to EduCenterJM, ${form.name.split(' ')[0]}.` })
    } catch (err: any) {
      addToast({ type: 'error', title: 'Registration failed', body: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/email', { method: 'POST', body: { to: forgotEmail, subject: 'EduCenterJM — Password Reset', body: 'A password reset link has been requested for your EduCenterJM account. (Demo mode — no real link.)' } })
      addToast({ type: 'success', title: 'Reset link sent', body: `Check ${forgotEmail} for instructions.` })
      setMode('login')
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not send email', body: err.message })
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(acc: typeof demoAccounts[number]) {
    setPortal(acc.portal)
    setForm({ ...form, email: acc.email, password: acc.password })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand/10 via-brand/10 to-brand/10 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-brand/10">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />

      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition hover:scale-105 hover:text-foreground"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="glass relative z-[1] w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-brand/10">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong text-brand-foreground shadow-xl shadow-brand/30 ring-4 ring-white/40 dark:ring-white/10">
            {settings?.logo ? (
              <img src={settings.logo} alt="School logo" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <GraduationCap className="h-11 w-11" />
            )}
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            <span className="text-brand dark:text-brand">Edu</span>
            <span>Center</span>
            <span className="text-brand dark:text-brand">JM</span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-foreground/70">{settings?.tagline || 'Secondary School Management System'}</p>
        </div>

        {mode === 'login' && (
          <>
            <div className="mb-6 flex border-b border-border">
              {(['Staff', 'Student'] as Portal[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPortal(p)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors',
                    portal === p ? 'border-brand/60 text-brand dark:text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p === 'Staff' ? <ShieldCheck className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                  {p} Portal
                </button>
              ))}
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-10" placeholder="you@edu.edu" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-10" placeholder="••••••••" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-brand text-brand-foreground shadow-lg shadow-brand/25 transition hover:bg-brand-strong hover:shadow-brand/40 active:scale-[0.98]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </Button>
              <div className="flex flex-col items-center gap-2 pt-2 text-sm sm:flex-row sm:justify-center">
                <button type="button" onClick={() => setMode('register')} className="text-muted-foreground underline-offset-2 transition hover:text-brand hover:underline">
                  Register New User
                </button>
                <span className="hidden text-border sm:inline">·</span>
                <button type="button" onClick={() => setMode('forgot')} className="text-muted-foreground underline-offset-2 transition hover:text-brand hover:underline">
                  Forgot Password?
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-brand/25 bg-brand/5 p-3 dark:border-brand/40 dark:bg-brand/10">
              <p className="mb-2.5 text-center text-xs font-semibold uppercase tracking-wide text-brand-strong dark:text-brand">Demo accounts — click to autofill</p>
              <div className="grid grid-cols-3 gap-2">
                {demoAccounts.map((a) => (
                  <button key={a.label} onClick={() => quickLogin(a)} className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-2 py-2.5 text-xs font-medium transition hover:scale-105 hover:border-brand/50 hover:bg-brand/5 hover:shadow-sm dark:hover:bg-brand/10">
                    <span className="font-semibold">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand" />
              <h2 className="font-serif text-xl font-semibold">Create Account</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="r-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-10" placeholder="Jane Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="r-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-10" placeholder="you@edu.edu" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="r-password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-10" placeholder="••••••••" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>I am a...</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['Student', 'Teacher'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={cn('flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition', form.role === r ? 'border-brand/60 bg-brand/5 text-brand-strong dark:bg-brand/12 dark:text-brand' : 'border-border hover:bg-muted')}
                  >
                    {r === 'Student' ? <GraduationCap className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-brand text-brand-foreground hover:bg-brand-strong">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create Account
            </Button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-muted-foreground underline-offset-2 hover:text-brand hover:underline">
              Back to Login
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="mb-2 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-brand" />
              <h2 className="font-serif text-xl font-semibold">Reset Password</h2>
            </div>
            <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
            <div className="space-y-2">
              <Label htmlFor="f-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="f-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="pl-10" placeholder="you@edu.edu" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-brand text-brand-foreground hover:bg-brand-strong">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Reset Link
            </Button>
            <button type="button" onClick={() => setMode('login')} className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-brand hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </button>
          </form>
        )}
      </div>

      <p className="relative z-[1] mt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} EduCenterJM · Secured with care
      </p>
    </div>
  )
}
