'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

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

  const inputCls = 'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent-40)] transition'

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] flex items-center justify-center px-6 py-12">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2">
            <SiteLogo size="hero" />
          </div>
          <p className="text-[var(--sl-text-30)] text-sm tracking-widest">RESET PASSWORD</p>
        </div>

        <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-2">
              <p className="text-[var(--sl-text)] font-semibold">Password updated!</p>
              <p className="text-[var(--sl-text-30)] text-sm">Taking you to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1">
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1">
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                  className={inputCls}
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'UPDATING…' : 'SET NEW PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
