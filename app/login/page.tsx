'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SignupModal from '@/app/components/SignupModal'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
const [showSignup, setShowSignup] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'

const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push(nextPath)
      }
    } finally {
      setEmailLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo })
    setForgotLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setForgotSent(true)
    }
  }

return (
    <>
      {/* ── FULL SCREEN LAYOUT ── */}
      <div className="flex min-h-screen overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div
          className="w-[70px] flex-shrink-0 relative flex items-center justify-center"
          style={{
            background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
            borderTop: '4px solid #C0392B',
            borderBottom: '4px solid #C0392B',
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }}
          />
        </div>

        {/* MAIN AREA — court background */}
        <div
          className="flex-1 relative flex items-center justify-center"
          style={{
            backgroundImage: "url('/COURTNFLOOR.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 70%',
            backgroundColor: '#1a0a0a',
          }}
        >
          <div className="relative z-10 flex flex-col items-center w-full max-w-[340px] px-4">

            {/* Logo + subtitle */}
            <img
              src="/sqshLIFE-logo.png"
              alt="SQSH.LIFE"
              className="w-[260px] h-auto mb-1"
            />
            <p
              className="text-sm font-bold tracking-[0.22em] uppercase mb-3"
              style={{ color: '#222' }}
            >
              Player Portal
            </p>

            {/* Card */}
            <div
              className="w-full rounded-2xl px-6 py-4"
              style={{ backdropFilter: 'blur(12px)' }}
            >

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || emailLoading}
                className="w-full flex items-center justify-center gap-2.5 bg-white rounded-lg py-[11px] px-4 text-sm font-semibold text-[#222] transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1.5px solid #C0392B' }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.3 4.6-17.7 11.7z"/>
                  <path fill="#FBBC05" d="M24 45c5.8 0 10.7-1.9 14.3-5.1l-6.6-5.4C29.8 36.1 27 37 24 37c-5.7 0-10.6-3.1-11.7-7.5l-7 5.4C8 40.5 15.5 45 24 45z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.5 2.7-2 5-4.2 6.5l6.6 5.4C41.7 37.3 45 31 45 24c0-1.4-.1-2.7-.5-4z"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* OR divider */}
              <div className="flex items-center gap-2.5 my-3">
                <div className="flex-1 h-px" style={{ background: '#C0392B' }} />
                <span className="text-xs" style={{ color: '#C0392B' }}>OR</span>
                <div className="flex-1 h-px" style={{ background: '#C0392B' }} />
              </div>

              {/* Email / Password / Forgot */}
              {!showForgot ? (
                <form onSubmit={handleSignIn} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px] text-[#222]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                      style={{
                        border: '1.5px solid #C0392B',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#C0392B',
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-[5px]">
                      <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#222]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotEmail(email); setError(null) }}
                        className="text-[10px] tracking-[0.05em] transition hover:underline"
                        style={{ color: '#C0392B' }}
                      >
                        FORGOT?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                      style={{
                        border: '1.5px solid #C0392B',
                        background: 'rgba(255,255,255,0.12)',
                        color: '#C0392B',
                      }}
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs">{error}</p>}

                  <button
                    type="submit"
                    disabled={emailLoading || googleLoading}
                    className="w-full py-3 rounded-lg text-sm font-bold tracking-[0.1em] uppercase text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    style={{ background: '#C0392B' }}
                  >
                    {emailLoading ? 'SIGNING IN…' : 'SIGN IN'}
                  </button>

                  <div className="h-px mt-[18px] mb-3.5" style={{ background: 'rgba(192,57,43,0.3)' }} />

                  <button
                    type="button"
                    onClick={() => setShowSignup(true)}
                    disabled={emailLoading || googleLoading}
                    className="w-full text-center text-xs transition hover:underline disabled:opacity-50"
                    style={{ color: '#C0392B' }}
                  >
                    New here? Create your account →
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5">
                  {forgotSent ? (
                    <div className="text-center space-y-3">
                      <p className="text-sm" style={{ color: '#C0392B' }}>Check your inbox!</p>
                      <p className="text-xs" style={{ color: 'rgba(192,57,43,0.7)' }}>
                        A reset link was sent to <span style={{ color: '#C0392B' }}>{forgotEmail}</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
                        className="w-full py-2.5 rounded-lg text-xs font-semibold tracking-widest transition hover:opacity-80"
                        style={{ border: '1.5px solid #C0392B', color: '#C0392B' }}
                      >
                        BACK TO SIGN IN
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px] text-[#222]">
                          Enter your email
                        </label>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          autoComplete="email"
                          required
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                          style={{
                            border: '1.5px solid #C0392B',
                            background: 'rgba(255,255,255,0.12)',
                            color: '#C0392B',
                          }}
                        />
                      </div>
                      {error && <p className="text-red-400 text-xs">{error}</p>}
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-3 rounded-lg text-sm font-bold tracking-[0.1em] uppercase text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: '#C0392B' }}
                      >
                        {forgotLoading ? 'SENDING…' : 'SEND RESET LINK'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(false); setError(null) }}
                        className="w-full py-2.5 rounded-lg text-xs font-semibold tracking-widest transition hover:opacity-80"
                        style={{ border: '1.5px solid #C0392B', color: '#C0392B' }}
                      >
                        BACK TO SIGN IN
                      </button>
                    </form>
                  )}
                </div>
              )}


            </div>

            {/* Footer */}
            <p className="mt-3 text-[10px] tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              © 2026 SQSH.LIFE
            </p>

          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className="w-[70px] flex-shrink-0 relative flex items-center justify-center"
          style={{
            background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
            borderTop: '4px solid #C0392B',
            borderBottom: '4px solid #C0392B',
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }}
          />
        </div>

      </div>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </>
  )
}
