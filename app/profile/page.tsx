'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Fuse from 'fuse.js'
import ThemeToggle from '@/app/components/ThemeToggle'
import SiteLogo from '@/app/components/SiteLogo'
import CLUBS_RAW from '../../squash_clubs.json'

interface Club { name: string; city: string; region: string; country: string }
const CLUBS = CLUBS_RAW as Club[]

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
  const [usrRating, setUsrRating] = useState('')
  const [division, setDivision] = useState('')
  const [homeClub, setHomeClub] = useState('')
  const [noHomeClub, setNoHomeClub] = useState(false)
  const [clubQuery, setClubQuery] = useState('')
  const [clubOpen, setClubOpen] = useState(false)
  const [clubFreeText, setClubFreeText] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(() => new Fuse(CLUBS, { keys: ['name', 'city'], threshold: 0.4, minMatchCharLength: 1 }), [])

  const clubResults = useMemo<Club[]>(() => {
    if (!clubQuery.trim()) return CLUBS.slice(0, 10)
    return fuse.search(clubQuery).map(r => r.item).slice(0, 10)
  }, [clubQuery, fuse])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) setClubOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectClub = (club: Club) => { setHomeClub(club.name); setNoHomeClub(false); setClubOpen(false) }
  const selectNoHomeClub = () => { setHomeClub(''); setNoHomeClub(true); setClubOpen(false) }
  const selectFreeText = () => { setClubFreeText(true); setClubOpen(false) }
  const clearClub = () => { setHomeClub(''); setNoHomeClub(false); setClubQuery('') }

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

      // Load existing player profile
      const { data: player } = await supabase
        .from('players')
        .select('first_name, last_name, phone, gender, usr_rating, club_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (player) {
        if (player.first_name) setFirstName(player.first_name)
        if (player.last_name) setLastName(player.last_name)
        if (player.phone) setPhone(player.phone)
        if (player.gender) setGender(player.gender)
        if (player.usr_rating != null) {
          setUsrRating(String(player.usr_rating))
          setDivision(ratingToDivision(Number(player.usr_rating)))
        }
        if (player.club_name) setHomeClub(player.club_name)
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

    const emailPrefix = (user.email ?? '').split('@')[0]
    const { error } = await supabase.from('players').upsert({
      user_id:    user.id,
      email:      user.email ?? '',
      username:   emailPrefix,
      first_name: firstName.trim() || '',
      last_name:  lastName.trim() || '',
      phone:      phone.trim() || '',
      gender:     gender || '',
      usr_rating: usrRating ? parseFloat(usrRating) : null,
      club_name:  noHomeClub ? '' : (homeClub.trim() || ''),
    }, { onConflict: 'user_id' })

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
            <div>
              <label className={labelCls}>GENDER</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            {/* Home Club */}
            <div ref={clubRef}>
              <label className={labelCls}>HOME CLUB</label>
              {clubFreeText ? (
                <div>
                  <input
                    type="text"
                    value={homeClub}
                    onChange={e => setHomeClub(e.target.value)}
                    placeholder="Enter your club name"
                    autoComplete="off"
                    className={inputCls}
                  />
                  <button type="button" onClick={() => { setClubFreeText(false); setClubQuery(homeClub); setClubOpen(true) }}
                    className="text-[10px] text-[var(--sl-accent-60)] hover:text-[var(--sl-accent)] transition mt-1 block">
                    ← Search the list instead
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={clubOpen ? clubQuery : (noHomeClub ? '' : homeClub)}
                      onChange={e => { setClubQuery(e.target.value); setClubOpen(true); setHomeClub(''); setNoHomeClub(false) }}
                      onFocus={() => { setClubQuery(noHomeClub ? '' : homeClub); setClubOpen(true) }}
                      placeholder={noHomeClub ? 'No Home Club' : homeClub || 'Search by club name or city…'}
                      autoComplete="off"
                      className={`${inputCls} pr-7 ${noHomeClub ? 'text-[var(--sl-text-30)]' : ''}`}
                    />
                    {(homeClub || noHomeClub) && !clubOpen && (
                      <button type="button" onClick={clearClub}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sl-text-30)] hover:text-[var(--sl-text)] transition text-base leading-none"
                        aria-label="Clear">×</button>
                    )}
                  </div>
                  {clubOpen && (
                    <div className="mt-1 rounded-lg border border-[var(--sl-border)] bg-[var(--sl-surface-deep)] overflow-hidden z-10 relative">
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectNoHomeClub}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--sl-text-40)] hover:bg-[var(--sl-surface-hover)] transition border-b border-[var(--sl-border)] flex items-center gap-2">
                        <span className="text-[var(--sl-text-20)] font-bold">—</span> No Home Club
                      </button>
                      <div className="max-h-40 overflow-y-auto">
                        {clubResults.length > 0 ? clubResults.map((club, i) => (
                          <button key={i} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectClub(club)}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--sl-surface-hover)] transition">
                            <span className="text-sm text-[var(--sl-text)]">{club.name}</span>
                            <span className="text-xs text-[var(--sl-text-30)] ml-1.5">— {club.city}, {club.region}</span>
                          </button>
                        )) : (
                          <p className="px-3 py-2.5 text-sm text-[var(--sl-text-30)]">No clubs found</p>
                        )}
                      </div>
                      <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectFreeText}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--sl-accent-60)] hover:bg-[var(--sl-surface-hover)] hover:text-[var(--sl-accent)] transition border-t border-[var(--sl-border)]">
                        + My club isn&apos;t listed — add it
                      </button>
                    </div>
                  )}
                </div>
              )}
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
