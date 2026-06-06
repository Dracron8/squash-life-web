'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Fuse from 'fuse.js'
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

const SIDEBAR_STYLE = {
  background: 'linear-gradient(to bottom, #1a0a0a, #2a1010, #111)',
  borderTop: '4px solid #C0392B',
  borderBottom: '4px solid #C0392B',
}

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.18)',
  backdropFilter: 'blur(12px)',
  border: '1.5px solid rgba(192,57,43,0.3)',
}

const inputStyle = {
  border: '1.5px solid rgba(192,57,43,0.4)',
  background: 'rgba(255,255,255,0.12)',
  color: '#111',
}

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

      const meta = user.user_metadata ?? {}
      if (meta.given_name) setFirstName(meta.given_name)
      else if (meta.full_name) setFirstName(meta.full_name.split(' ')[0] ?? '')
      if (meta.family_name) setLastName(meta.family_name)
      else if (meta.full_name) setLastName(meta.full_name.split(' ').slice(1).join(' '))

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
      <div className="flex h-screen overflow-hidden">
        <div className="w-[70px] flex-shrink-0" style={SIDEBAR_STYLE} />
        <div className="flex-1 flex items-center justify-center" style={{
          backgroundImage: "url('/COURTNFLOOR.png')", backgroundSize: 'cover',
          backgroundPosition: 'center 70%', backgroundColor: '#1a0a0a',
        }}>
          <div className="w-8 h-8 border-2 border-[#C0392B] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="w-[70px] flex-shrink-0" style={SIDEBAR_STYLE} />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-y-auto" style={{
        backgroundImage: "url('/COURTNFLOOR.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 70%',
        backgroundAttachment: 'fixed',
        backgroundColor: '#1a0a0a',
      }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-4"
          style={{ borderBottom: '1px solid rgba(192,57,43,0.25)', backdropFilter: 'blur(12px)' }}>
          <Link href="/" className="flex flex-col items-start">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-12 w-auto" />
            <p className="text-sm font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: '#222' }}>
              My Profile
            </p>
          </Link>
          <Link href="/dashboard"
            className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 rounded-lg transition hover:opacity-80"
            style={{ color: '#C0392B', border: '1.5px solid rgba(192,57,43,0.4)' }}>
            ← DASHBOARD
          </Link>
        </div>

        {/* CONTENT */}
        <div className="max-w-lg mx-auto px-8 py-8">

          <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Account</p>
          <h1 className="text-2xl font-bold tracking-[0.14em] mb-6" style={{ color: '#111' }}>MY PROFILE</h1>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Personal */}
            <div className="rounded-2xl p-6 space-y-4" style={CARD_STYLE}>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(0,0,0,0.4)' }}>PERSONAL INFO</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>FIRST NAME</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>LAST NAME</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>PHONE</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (416) 555-0100"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                  style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>GENDER</label>
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                  style={inputStyle}>
                  <option value="">Select…</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>

              {/* Home Club */}
              <div ref={clubRef}>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>HOME CLUB</label>
                {clubFreeText ? (
                  <div>
                    <input
                      type="text"
                      value={homeClub}
                      onChange={e => setHomeClub(e.target.value)}
                      placeholder="Enter your club name"
                      autoComplete="off"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => { setClubFreeText(false); setClubQuery(homeClub); setClubOpen(true) }}
                      className="text-[10px] transition mt-1 block hover:underline"
                      style={{ color: 'rgba(192,57,43,0.6)' }}>
                      ← Search the list instead
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={clubOpen ? clubQuery : (noHomeClub ? '' : homeClub)}
                      onChange={e => { setClubQuery(e.target.value); setClubOpen(true); setHomeClub(''); setNoHomeClub(false) }}
                      onFocus={() => { setClubQuery(noHomeClub ? '' : homeClub); setClubOpen(true) }}
                      placeholder={noHomeClub ? 'No Home Club' : homeClub || 'Search by club name or city…'}
                      autoComplete="off"
                      className="w-full rounded-lg px-3 py-2 pr-7 text-sm outline-none transition"
                      style={{ ...inputStyle, color: noHomeClub ? '#888' : '#111' }}
                    />
                    {(homeClub || noHomeClub) && !clubOpen && (
                      <button type="button" onClick={clearClub}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base leading-none transition hover:opacity-60"
                        style={{ color: '#888' }}
                        aria-label="Clear">×</button>
                    )}
                    {clubOpen && (
                      <div className="mt-1 rounded-lg overflow-hidden z-10 relative"
                        style={{ border: '1.5px solid rgba(192,57,43,0.3)', background: 'rgba(255,255,255,0.95)' }}>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectNoHomeClub}
                          className="w-full text-left px-3 py-2 text-sm transition flex items-center gap-2"
                          style={{ color: '#888', borderBottom: '1px solid rgba(192,57,43,0.15)' }}>
                          <span className="font-bold" style={{ color: '#aaa' }}>—</span> No Home Club
                        </button>
                        <div className="max-h-40 overflow-y-auto">
                          {clubResults.length > 0 ? clubResults.map((club, i) => (
                            <button key={i} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectClub(club)}
                              className="w-full text-left px-3 py-2 transition hover:bg-red-50">
                              <span className="text-sm" style={{ color: '#111' }}>{club.name}</span>
                              <span className="text-xs ml-1.5" style={{ color: '#888' }}>— {club.city}, {club.region}</span>
                            </button>
                          )) : (
                            <p className="px-3 py-2.5 text-sm" style={{ color: '#888' }}>No clubs found</p>
                          )}
                        </div>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectFreeText}
                          className="w-full text-left px-3 py-2 text-sm transition hover:bg-red-50"
                          style={{ color: '#C0392B', borderTop: '1px solid rgba(192,57,43,0.15)' }}>
                          + My club isn&apos;t listed — add it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Squash rating */}
            <div className="rounded-2xl p-6 space-y-4" style={CARD_STYLE}>
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(0,0,0,0.4)' }}>CLUB LOCKER RATING</p>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-[5px]" style={{ color: '#222' }}>YOUR CURRENT RATING</label>
                <input
                  type="number"
                  value={usrRating}
                  onChange={e => handleRatingChange(e.target.value)}
                  placeholder="e.g. 4.5"
                  step="0.01" min="0" max="7"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition"
                  style={inputStyle}
                />
                {usrRating && division && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: '#C0392B' }}>
                    Division: <span className="font-bold">{division}</span>
                  </p>
                )}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving || saved}
              className="w-full py-4 rounded-xl text-sm font-bold tracking-[0.14em] uppercase text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#C0392B' }}>
              {saved ? 'SAVED!' : saving ? 'SAVING…' : 'SAVE PROFILE'}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[70px] flex-shrink-0 relative" style={SIDEBAR_STYLE}>
        <div className="absolute bottom-0 left-0 right-0 h-[220px] pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(192,57,43,0.45), transparent)' }} />
      </div>

    </div>
  )
}
