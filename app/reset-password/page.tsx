'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SIDEBAR_STYLE = {
  background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
  borderTop: '4px solid #C0392B',
  borderBottom: '4px solid #C0392B',
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  const inputStyle = {
    border: '1.5px solid #C0392B',
    background: 'rgba(255,255,255,0.12)',
    color: '#C0392B',
  }

  return (
    <div className="flex min-h-screen overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative flex items-center justify-center" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

      {/* MAIN */}
      <div className="flex-1 relative flex items-center justify-center" style={{
        backgroundImage: "url('/COURTNFLOOR.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 70%',
        backgroundColor: '#1a0a0a',
      }}>
        <div className="relative z-10 flex flex-col items-center w-full max-w-[340px] px-4">

          {/* Logo */}
          <Link href="/">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="w-[260px] h-auto mb-1" />
          </Link>
          <p className="text-sm font-bold tracking-[0.22em] uppercase mb-6" style={{ color: '#222' }}>
            Reset Password
          </p>

          {/* Card */}
          <div className="w-full rounded-2xl px-6 py-5" style={{ backdropFilter: 'blur(12px)' }}>
            {done ? (
              <div className="text-center space-y-3">
                <p className="text-sm font-bold tracking-[0.14em]" style={{ color: '#C0392B' }}>Password updated!</p>
                <p className="text-xs" style={{ color: 'rgba(192,57,43,0.7)' }}>Taking you to your dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={inputStyle}
                  />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-bold tracking-[0.1em] uppercase text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                  style={{ background: '#C0392B' }}>
                  {loading ? 'UPDATING…' : 'SET NEW PASSWORD'}
                </button>
              </form>
            )}
          </div>

          <p className="mt-3 text-[10px] tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © 2026 SQSH.LIFE
          </p>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative flex items-center justify-center" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

    </div>
  )
}
