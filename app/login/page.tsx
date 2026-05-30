'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

  return (
    <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold tracking-widest text-[#d4af37] mb-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            SQUASH LIFE
          </h1>
          <p className="text-white/30 text-sm tracking-widest">PLAYER PORTAL</p>
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 space-y-6">

          {/* ── Google ── */}
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* ── Email / Password ── */}
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-white/30 mb-1">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37]/40 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-white/30 mb-1">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37]/40 transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#d4af37] text-black font-bold tracking-widest text-sm hover:bg-[#c9a84c] transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              SIGN IN
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-white/10 text-white/40 font-semibold text-xs tracking-widest hover:border-white/20 hover:text-white/60 transition disabled:opacity-50"
            >
              CREATE ACCOUNT
            </button>
          </form>

          {/* ── Dev Bypass (localhost only) ── */}
          {isLocalhost && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-white/10 text-[10px] tracking-widest">DEV</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <button
                onClick={handleDevBypass}
                className="w-full py-2 rounded-lg border border-dashed border-white/10 text-white/20 text-xs tracking-widest hover:text-white/40 hover:border-white/20 transition"
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
