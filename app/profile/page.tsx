'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'

function ratingToDivision(r: number): string {
  if (r >= 5.5) return 'OPEN'
  if (r >= 4.5) return 'A'
  if (r >= 3.5) return 'B'
  if (r >= 2.5) return 'C'
  return 'D'
}

const inputCls = 'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent-40)] transition'
const labelCls = 'block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [handedness, setHandedness] = useState('')
  const [usrRating, setUsrRating] = useState('')
  const [division, setDivision] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Pre-fill from Google metadata if available
      const meta = user.user_metadata ?? {}
      if (meta.given_name) setFirstName(meta.given_name)
      else if (meta.full_name) setFirstName(meta.full_name.split(' ')[0] ?? '')
      if (meta.family_name) setLastName(meta.family_name)
      else if (meta.full_name) setLastName(meta.full_name.split(' ').slice(1).join(' '))

      // Override with any existing profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, gender, date_of_birth, handedness, usr_rating, division')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.first_name) setFirstName(profile.first_name)
        if (profile.last_name) setLastName(profile.last_name)
        if (profile.phone) setPhone(profile.phone)
        if (profile.gender) setGender(profile.gender)
        if (profile.date_of_birth) setDob(profile.date_of_birth)
        if (profile.handedness) setHandedness(profile.handedness)
        if (profile.usr_rating != null) setUsrRating(String(profile.usr_rating))
        if (profile.division) setDivision(profile.division)
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleRatingChange = (val: string) => {
    setUsrRating(val)
    const num = parseFloat(val)
    if (!isNaN(num)) setDivision(ratingToDivision(num))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      phone: phone.trim() || null,
      gender: gender || null,
      date_of_birth: dob || null,
      handedness: handedness || null,
      usr_rating: usrRating ? parseFloat(usrRating) : null,
      division: division || null,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--sl-bg)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--sl-accent)] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--sl-bg)] text-[var(--sl-text)]">
      <header className="border-b border-[var(--sl-border)] px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--sl-bg)' }}>
        <Link href="/"><SiteLogo /></Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/dashboard" className="text-xs font-semibold tracking-widest text-[var(--sl-text-30)] hover:text-[var(--sl-text-60)] transition">
            ← DASHBOARD
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[var(--sl-text-30)] text-xs tracking-widest mb-1">ACCOUNT</p>
          <h1 className="text-2xl font-bold tracking-wider">MY PROFILE</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Personal */}
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)]">PERSONAL INFO</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>FIRST NAME</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>LAST NAME</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>PHONE</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (416) 555-0100" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>GENDER</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>HANDEDNESS</label>
                <select value={handedness} onChange={e => setHandedness(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option>Right</option>
                  <option>Left</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>DATE OF BIRTH</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Squash rating */}
          <div className="bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-[var(--sl-text-30)]">CLUB LOCKER RATING</p>
            <div>
              <label className={labelCls}>YOUR CURRENT RATING</label>
              <input
                type="number"
                value={usrRating}
                onChange={e => handleRatingChange(e.target.value)}
                placeholder="e.g. 4.5"
                step="0.01" min="0" max="7"
                className={inputCls}
              />
              {usrRating && division && (
                <p className="text-[var(--sl-accent)] text-xs mt-2 font-semibold">
                  Division: <span className="font-bold">{division}</span>
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || saved}
            className="w-full py-4 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50"
          >
            {saved ? 'SAVED!' : saving ? 'SAVING…' : 'SAVE PROFILE'}
          </button>
        </form>
      </div>
    </main>
  )
}
