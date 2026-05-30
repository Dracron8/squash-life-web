'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost')
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
    })
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Enter an email and password first.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleDevBypass = () => {
    localStorage.setItem('devMode', 'true')
    router.push('/dashboard')
  }

  const inputCls = 'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent-40)] transition'

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] flex items-center justify-center px-6 py-12">
      {/* Theme toggle pinned top-right */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2">
            <SiteLogo size="hero" />
          </div>
          <p className="text-[var(--sl-text-30)] text-sm tracking-widest">PLAYER PORTAL</p>
        </div>

        <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-8 space-y-6">

          {/* ── Google ── */}
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--sl-border)]" />
            <span className="text-[var(--sl-text-20)] text-xs tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[var(--sl-border)]" />
          </div>

          {/* ── Email / Password ── */}
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              SIGN IN
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-[var(--sl-border)] text-[var(--sl-text-40)] font-semibold text-xs tracking-widest hover:border-[var(--sl-text-20)] hover:text-[var(--sl-text-60)] transition disabled:opacity-50"
            >
              CREATE ACCOUNT
            </button>
          </form>

          {/* ── Dev Bypass (localhost only) ── */}
          {isLocalhost && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--sl-border-faint)]" />
                <span className="text-[var(--sl-text-10)] text-[10px] tracking-widest">DEV</span>
                <div className="flex-1 h-px bg-[var(--sl-border-faint)]" />
              </div>
              <button
                onClick={handleDevBypass}
                className="w-full py-2 rounded-lg border border-dashed border-[var(--sl-border)] text-[var(--sl-text-20)] text-xs tracking-widest hover:text-[var(--sl-text-40)] hover:border-[var(--sl-text-20)] transition"
              >
                Enter as Dev Player
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
