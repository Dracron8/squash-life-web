'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import CLUBS_RAW from '../../squash_clubs.json'

// ── Club data ─────────────────────────────────────────────────────────────────

interface Club { name: string; city: string; region: string; country: string }
const CLUBS = CLUBS_RAW as Club[]

const PROVINCE_CODE: Record<string, string> = {
  Alberta: 'AB', 'British Columbia': 'BC', Manitoba: 'MB', 'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS', 'Northwest Territories': 'NT',
  Nunavut: 'NU', Ontario: 'ON', 'Prince Edward Island': 'PE', Quebec: 'QC',
  Saskatchewan: 'SK', Yukon: 'YT',
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX',
  Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
  'Australian Capital Territory': 'ACT', 'New South Wales': 'NSW',
  'Northern Territory': 'NT', Queensland: 'QLD', 'South Australia': 'SA',
  Tasmania: 'TAS', Victoria: 'VIC', 'Western Australia': 'WA',
}

const REGIONS: Record<string, string[]> = {
  Canada: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
    'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
    'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  Australia: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory',
    'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia',
  ],
  'United Kingdom': ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  'New Zealand': [],
  Egypt: [],
  France: [],
  Germany: [],
  India: [],
  Malaysia: [],
  Netherlands: [],
  Pakistan: [],
  Singapore: [],
  'South Africa': [],
  Other: [],
}

const ALL_COUNTRIES = Object.keys(REGIONS)

function ratingToDivision(r: number): string {
  if (r >= 5.5) return 'OPEN'
  if (r >= 4.5) return 'A'
  if (r >= 3.5) return 'B'
  if (r >= 2.5) return 'C'
  return 'D'
}

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  border: '1.5px solid rgba(192,57,43,0.35)',
  background: 'rgba(255,255,255,0.85)',
  color: '#111',
}

const inp  = 'w-full rounded-lg px-4 py-2.5 text-sm outline-none transition focus:ring-0'
const inp2 = 'w-full rounded-lg px-3 py-2 text-sm outline-none transition focus:ring-0'
const lbl  = 'block text-[10px] font-bold tracking-[0.14em] uppercase mb-1'
const lbl2 = 'block text-[10px] font-bold tracking-[0.14em] uppercase mb-0.5'

// ── Types ────────────────────────────────────────────────────────────────────

interface Step1 {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

interface Step2 {
  gender: string
  dob: string
  handedness: string
  phone: string
  country: string
  province: string
  homeClub: string
  noHomeClub: boolean
  usrRating: string
  division: string
}

interface Props {
  onClose: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SignupModal({ onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [s1, setS1] = useState<Step1>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  })

  const [s2, setS2] = useState<Step2>({
    gender: '', dob: '', handedness: '', phone: '',
    country: 'Canada', province: '', homeClub: '',
    noHomeClub: false, usrRating: '', division: '',
  })

  const [agreeToS, setAgreeToS] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)

  const [clubQuery, setClubQuery] = useState('')
  const [clubOpen, setClubOpen] = useState(false)
  const [clubFreeText, setClubFreeText] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(() => new Fuse(CLUBS, {
    keys: ['name', 'city'], threshold: 0.4, minMatchCharLength: 1,
  }), [])

  const clubResults = useMemo<Club[]>(() => {
    const code = PROVINCE_CODE[s2.province] ?? ''
    const sortByProvince = (list: Club[]) => {
      if (!code) return list
      return [...list.filter(c => c.region === code), ...list.filter(c => c.region !== code)]
    }
    if (!clubQuery.trim()) return sortByProvince(CLUBS).slice(0, 10)
    return sortByProvince(fuse.search(clubQuery).map(r => r.item)).slice(0, 10)
  }, [clubQuery, fuse, s2.province])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) setClubOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const provinces = REGIONS[s2.country] ?? []

  const handleClose = useCallback(() => onClose(), [onClose])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [handleClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const set1 = (k: keyof Step1) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS1(prev => ({ ...prev, [k]: e.target.value }))

  const validateStep1 = (): string | null => {
    if (!s1.firstName.trim()) return 'First name is required.'
    if (!s1.lastName.trim()) return 'Last name is required.'
    if (!s1.email.trim() || !s1.email.includes('@')) return 'A valid email is required.'
    if (s1.password.length < 8) return 'Password must be at least 8 characters.'
    if (s1.password !== s1.confirmPassword) return 'Passwords do not match.'
    return null
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) { setError(err); return }
    setError(null)
    setStep(2)
  }

  const set2inp = (k: keyof Step2) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS2(prev => ({ ...prev, [k]: e.target.value }))

  const set2sel = (k: keyof Step2) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setS2(prev => ({ ...prev, [k]: e.target.value }))

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const num = parseFloat(val)
    setS2(prev => ({ ...prev, usrRating: val, division: isNaN(num) ? prev.division : ratingToDivision(num) }))
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setS2(prev => ({ ...prev, country: e.target.value, province: '' }))

  const selectClub = (club: Club) => { setS2(p => ({ ...p, homeClub: club.name, noHomeClub: false })); setClubOpen(false); setClubQuery('') }
  const selectNoHomeClub = () => { setS2(p => ({ ...p, homeClub: '', noHomeClub: true })); setClubOpen(false); setClubQuery('') }
  const selectFreeText = () => { setS2(p => ({ ...p, homeClub: clubQuery, noHomeClub: false })); setClubFreeText(true); setClubOpen(false) }
  const clearClub = () => { setS2(p => ({ ...p, homeClub: '', noHomeClub: false })); setClubQuery(''); setClubFreeText(false); setClubOpen(true) }

  const handleSubmit = async () => {
    if (!agreeToS || !agreePrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: s1.email.trim(),
        password: s1.password,
        options: {
          data: { full_name: `${s1.firstName.trim()} ${s1.lastName.trim()}` },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authErr) { setError(authErr.message); return }

      const userId = data.user?.id

      if (userId && data.session) {
        const username = `${s1.firstName.trim()}.${s1.lastName.trim()}`.toLowerCase().replace(/[^a-z0-9.]/g, '')
        const ratingNum = s2.usrRating ? parseFloat(s2.usrRating) : null

        await supabase.from('players').upsert({
          user_id: userId, username,
          first_name: s1.firstName.trim(), last_name: s1.lastName.trim(),
          gender: s2.gender || null, date_of_birth: s2.dob || null,
          handedness: s2.handedness || null, phone: s2.phone.trim() || null,
          country: s2.country || null, province: s2.province || null,
          home_club: s2.noHomeClub ? null : (s2.homeClub.trim() || null),
          usr_rating: ratingNum, division: s2.division || null,
        }, { onConflict: 'user_id' })

        router.push('/dashboard')
      } else if (userId) {
        setDone(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const clubInputValue = clubOpen ? clubQuery : (s2.noHomeClub ? '' : s2.homeClub)
  const clubInputPlaceholder = s2.noHomeClub ? 'No Home Club' : s2.homeClub || 'Search by club name or city…'

  const LABEL_COLOR = { color: '#222' }
  const SUBLABEL_COLOR = { color: 'rgba(0,0,0,0.4)' }
  const DIVIDER = { background: 'rgba(192,57,43,0.2)' }
  const DROPDOWN_STYLE = { border: '1.5px solid rgba(192,57,43,0.3)', background: 'rgba(255,255,255,0.97)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-3"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[96vh]"
        style={{ background: 'rgba(255,255,255,0.96)', border: '1.5px solid rgba(192,57,43,0.3)' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(192,57,43,0.15)' }}>
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-8 w-auto" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-[0.14em] uppercase" style={{ color: '#111' }}>CREATE ACCOUNT</h2>
              {!done && (
                <p className="text-[10px] tracking-[0.14em] uppercase mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
                  STEP {step} OF 2 — {step === 1 ? 'ACCOUNT' : 'PLAYER PROFILE'}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none transition hover:opacity-60"
              style={{ color: '#888' }}
              aria-label="Close"
            >×</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* Success: email confirmation needed */}
          {done ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(192,57,43,0.1)', border: '1.5px solid rgba(192,57,43,0.3)' }}>
                <svg className="w-7 h-7" fill="none" stroke="#C0392B" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-bold tracking-[0.14em] uppercase" style={{ color: '#111' }}>CHECK YOUR EMAIL</p>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#666' }}>
                  We sent a confirmation link to <span style={{ color: '#C0392B' }}>{s1.email}</span>.<br />
                  Click it to activate your account and sign in.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-xs tracking-[0.14em] uppercase transition hover:opacity-90"
                style={{ background: '#C0392B' }}>
                GOT IT
              </button>
            </div>
          ) : step === 1 ? (

            /* STEP 1: Account */
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl} style={LABEL_COLOR}>FIRST NAME <span style={{ color: '#C0392B' }}>*</span></label>
                  <input type="text" value={s1.firstName} onChange={set1('firstName')}
                    placeholder="Jane" autoComplete="given-name" className={inp} style={inputStyle} />
                </div>
                <div>
                  <label className={lbl} style={LABEL_COLOR}>LAST NAME <span style={{ color: '#C0392B' }}>*</span></label>
                  <input type="text" value={s1.lastName} onChange={set1('lastName')}
                    placeholder="Smith" autoComplete="family-name" className={inp} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className={lbl} style={LABEL_COLOR}>EMAIL <span style={{ color: '#C0392B' }}>*</span></label>
                <input type="email" value={s1.email} onChange={set1('email')}
                  placeholder="you@example.com" autoComplete="email" className={inp} style={inputStyle} />
              </div>
              <div>
                <label className={lbl} style={LABEL_COLOR}>PASSWORD <span style={{ color: '#C0392B' }}>*</span></label>
                <input type="password" value={s1.password} onChange={set1('password')}
                  placeholder="Minimum 8 characters" autoComplete="new-password" className={inp} style={inputStyle} />
              </div>
              <div>
                <label className={lbl} style={LABEL_COLOR}>CONFIRM PASSWORD <span style={{ color: '#C0392B' }}>*</span></label>
                <input type="password" value={s1.confirmPassword} onChange={set1('confirmPassword')}
                  placeholder="••••••••" autoComplete="new-password" className={inp} style={inputStyle} />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

          ) : (

            /* STEP 2: Player Profile */
            <div className="space-y-2.5">

              {/* Row 1: Gender | DOB | Handedness */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>GENDER</label>
                  <select value={s2.gender} onChange={set2sel('gender')} className={inp2} style={inputStyle}>
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>DATE OF BIRTH</label>
                  <input type="date" value={s2.dob} onChange={set2inp('dob')} className={inp2} style={inputStyle} />
                </div>
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>HANDEDNESS</label>
                  <select value={s2.handedness} onChange={set2sel('handedness')} className={inp2} style={inputStyle}>
                    <option value="">Select…</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Phone | Country | Province */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>PHONE</label>
                  <input type="tel" value={s2.phone} onChange={set2inp('phone')}
                    placeholder="+1 555 …" autoComplete="tel" className={inp2} style={inputStyle} />
                </div>
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>COUNTRY</label>
                  <select value={s2.country} onChange={handleCountryChange} className={inp2} style={inputStyle}>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>{s2.country === 'United States' ? 'STATE' : 'PROVINCE'}</label>
                  {provinces.length > 0 ? (
                    <select value={s2.province} onChange={set2sel('province')} className={inp2} style={inputStyle}>
                      <option value="">Select…</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={s2.province} onChange={set2inp('province')}
                      placeholder="Optional" className={inp2} style={inputStyle} />
                  )}
                </div>
              </div>

              {/* Home Club */}
              <div ref={clubRef}>
                <label className={lbl2} style={LABEL_COLOR}>HOME CLUB</label>
                {clubFreeText ? (
                  <div>
                    <input type="text" value={s2.homeClub} onChange={set2inp('homeClub')}
                      placeholder="Enter your club name" autoComplete="off" className={inp2} style={inputStyle} />
                    <button type="button" onClick={() => { setClubFreeText(false); setClubQuery(s2.homeClub); setClubOpen(true) }}
                      className="text-[10px] transition mt-1 block hover:underline"
                      style={{ color: 'rgba(192,57,43,0.6)' }}>
                      ← Search the list instead
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input type="text" value={clubInputValue}
                        onChange={e => { setClubQuery(e.target.value); setClubOpen(true); setS2(p => ({ ...p, homeClub: '', noHomeClub: false })) }}
                        onFocus={() => { setClubQuery(s2.noHomeClub ? '' : s2.homeClub); setClubOpen(true) }}
                        placeholder={clubInputPlaceholder} autoComplete="off"
                        className={`${inp2} pr-7`}
                        style={{ ...inputStyle, color: s2.noHomeClub ? '#888' : '#111' }} />
                      {(s2.homeClub || s2.noHomeClub) && !clubOpen && (
                        <button type="button" onClick={clearClub}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base leading-none transition hover:opacity-60"
                          style={{ color: '#888' }} aria-label="Clear">×</button>
                      )}
                    </div>
                    {clubOpen && (
                      <div className="mt-1 rounded-lg overflow-hidden z-10 relative" style={DROPDOWN_STYLE}>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectNoHomeClub}
                          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-red-50 transition"
                          style={{ color: '#888', borderBottom: '1px solid rgba(192,57,43,0.15)' }}>
                          <span className="font-bold" style={{ color: '#aaa' }}>—</span> No Home Club
                        </button>
                        <div className="max-h-36 overflow-y-auto">
                          {clubResults.length > 0 ? clubResults.map((club, i) => (
                            <button key={i} type="button" onMouseDown={e => e.preventDefault()} onClick={() => selectClub(club)}
                              className="w-full text-left px-3 py-2 hover:bg-red-50 transition">
                              <span className="text-sm" style={{ color: '#111' }}>{club.name}</span>
                              <span className="text-xs ml-1.5" style={{ color: '#888' }}>— {club.city}, {club.region}</span>
                            </button>
                          )) : (
                            <p className="px-3 py-2.5 text-sm" style={{ color: '#888' }}>No clubs found</p>
                          )}
                        </div>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={selectFreeText}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 transition"
                          style={{ color: '#C0392B', borderTop: '1px solid rgba(192,57,43,0.15)' }}>
                          + My club isn&apos;t listed — add it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rating | Division */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>USR / CL RATING (OPTIONAL)</label>
                  <input type="number" value={s2.usrRating} onChange={handleRatingChange}
                    min={1.5} max={7.0} step={0.5} placeholder="e.g. 4.0" className={inp2} style={inputStyle} />
                  <p className="text-[9px] mt-0.5" style={{ color: 'rgba(0,0,0,0.3)' }}>1.5 – 7.0 in 0.5 steps</p>
                </div>
                <div>
                  <label className={lbl2} style={LABEL_COLOR}>DIVISION</label>
                  <select value={s2.division} onChange={set2sel('division')} className={inp2} style={inputStyle}>
                    <option value="">Select…</option>
                    {(['OPEN', 'A', 'B', 'C'] as const).map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="D">D — Beginner</option>
                  </select>
                  {s2.usrRating && s2.division && (
                    <p className="text-[9px] mt-0.5" style={{ color: 'rgba(192,57,43,0.6)' }}>Auto-set — you can override</p>
                  )}
                </div>
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              {/* Checkboxes */}
              <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(192,57,43,0.15)' }}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreeToS} onChange={e => setAgreeToS(e.target.checked)}
                    className="mt-0.5 shrink-0" style={{ accentColor: '#C0392B' }} />
                  <span className="text-[11px] leading-tight" style={{ color: '#888' }}>
                    I agree to the <span style={{ color: '#C0392B' }} className="underline">Terms of Service</span>
                    {' '}<span style={{ color: '#C0392B' }}>*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)}
                    className="mt-0.5 shrink-0" style={{ accentColor: '#C0392B' }} />
                  <span className="text-[11px] leading-tight" style={{ color: '#888' }}>
                    I agree to the <span style={{ color: '#C0392B' }} className="underline">Privacy Policy</span>
                    {' '}<span style={{ color: '#C0392B' }}>*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)}
                    className="mt-0.5 shrink-0" style={{ accentColor: '#C0392B' }} />
                  <span className="text-[11px] leading-tight" style={{ color: 'rgba(0,0,0,0.4)' }}>
                    Send me tournament announcements and updates (optional)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 pb-5 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(192,57,43,0.15)' }}>
            {step === 1 ? (
              <div className="flex gap-3">
                <button onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold tracking-[0.14em] uppercase transition hover:opacity-70"
                  style={{ border: '1.5px solid rgba(0,0,0,0.15)', color: '#888' }}>
                  CANCEL
                </button>
                <button onClick={handleNext}
                  className="flex-[2] py-2.5 rounded-xl text-white font-bold tracking-[0.14em] uppercase text-sm transition hover:opacity-90"
                  style={{ background: '#C0392B' }}>
                  NEXT: PROFILE →
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setError(null) }} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold tracking-[0.14em] uppercase transition hover:opacity-70 disabled:opacity-50"
                  style={{ border: '1.5px solid rgba(0,0,0,0.15)', color: '#888' }}>
                  ← BACK
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-[2] py-2.5 rounded-xl text-white font-bold tracking-[0.14em] uppercase text-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#C0392B' }}>
                  {loading ? 'CREATING ACCOUNT…' : 'SIGN UP'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
