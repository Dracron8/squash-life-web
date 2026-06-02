'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { createClient } from '@/lib/supabase/client'
import SiteLogo from '@/app/components/SiteLogo'
import CLUBS_RAW from '../../squash_clubs.json'

// ── Club data ─────────────────────────────────────────────────────────────────

interface Club { name: string; city: string; region: string; country: string }
const CLUBS = CLUBS_RAW as Club[]

// ── Region data ──────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function ratingToDivision(r: number): string {
  if (r >= 5.5) return 'OPEN'
  if (r >= 4.5) return 'A'
  if (r >= 3.5) return 'B'
  if (r >= 2.5) return 'C'
  return 'D'
}

// ── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full bg-[var(--sl-surface-deep)] border border-[var(--sl-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--sl-text)] focus:outline-none focus:border-[var(--sl-accent-40)] transition'
const lbl = 'block text-[10px] font-bold tracking-widest text-[var(--sl-text-30)] mb-1'
const sel = `${inp} cursor-pointer`

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

  // ── Club search state ─────────────────────────────────────────────────────
  const [clubQuery, setClubQuery] = useState('')
  const [clubOpen, setClubOpen] = useState(false)
  const [clubFreeText, setClubFreeText] = useState(false)
  const clubRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(() => new Fuse(CLUBS, {
    keys: ['name', 'city'],
    threshold: 0.4,
    minMatchCharLength: 1,
  }), [])

  const clubResults = useMemo<Club[]>(() => {
    if (!clubQuery.trim()) return CLUBS.slice(0, 10)
    return fuse.search(clubQuery).slice(0, 10).map(r => r.item)
  }, [clubQuery, fuse])

  // Close club dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clubRef.current && !clubRef.current.contains(e.target as Node)) {
        setClubOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  const provinces = REGIONS[s2.country] ?? []

  // Close on Escape
  const handleClose = useCallback(() => onClose(), [onClose])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [handleClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Step 1 helpers ────────────────────────────────────────────────────────

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

  // ── Step 2 helpers ────────────────────────────────────────────────────────

  const set2inp = (k: keyof Step2) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS2(prev => ({ ...prev, [k]: e.target.value }))

  const set2sel = (k: keyof Step2) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setS2(prev => ({ ...prev, [k]: e.target.value }))

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const num = parseFloat(val)
    setS2(prev => ({
      ...prev,
      usrRating: val,
      division: isNaN(num) ? prev.division : ratingToDivision(num),
    }))
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setS2(prev => ({ ...prev, country: e.target.value, province: '' }))
  }

  // ── Club selection handlers ───────────────────────────────────────────────

  const selectClub = (club: Club) => {
    setS2(p => ({ ...p, homeClub: club.name, noHomeClub: false }))
    setClubOpen(false)
    setClubQuery('')
  }

  const selectNoHomeClub = () => {
    setS2(p => ({ ...p, homeClub: '', noHomeClub: true }))
    setClubOpen(false)
    setClubQuery('')
  }

  const selectFreeText = () => {
    setS2(p => ({ ...p, homeClub: clubQuery, noHomeClub: false }))
    setClubFreeText(true)
    setClubOpen(false)
  }

  const clearClub = () => {
    setS2(p => ({ ...p, homeClub: '', noHomeClub: false }))
    setClubQuery('')
    setClubFreeText(false)
    setClubOpen(true)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      })

      if (authErr) {
        setError(authErr.message)
        return
      }

      const userId = data.user?.id

      if (userId && data.session) {
        const username = `${s1.firstName.trim()}.${s1.lastName.trim()}`
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, '')

        const ratingNum = s2.usrRating ? parseFloat(s2.usrRating) : null

        await supabase.from('players').upsert({
          user_id: userId,
          username,
          first_name: s1.firstName.trim(),
          last_name: s1.lastName.trim(),
          gender: s2.gender || null,
          date_of_birth: s2.dob || null,
          handedness: s2.handedness || null,
          phone: s2.phone.trim() || null,
          country: s2.country || null,
          province: s2.province || null,
          home_club: s2.noHomeClub ? null : (s2.homeClub.trim() || null),
          usr_rating: ratingNum,
          division: s2.division || null,
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

  // ── Render ────────────────────────────────────────────────────────────────

  // What to show in the club search input
  const clubInputValue = clubOpen
    ? clubQuery
    : s2.noHomeClub ? '' : s2.homeClub

  const clubInputPlaceholder = s2.noHomeClub
    ? 'No Home Club'
    : s2.homeClub
      ? s2.homeClub
      : 'Search by club name or city…'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full max-w-lg bg-[var(--sl-surface)] border border-[var(--sl-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--sl-border)] shrink-0">
          <div className="flex justify-center mb-4">
            <SiteLogo size="nav" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-widest text-[var(--sl-text)]">CREATE ACCOUNT</h2>
              {!done && (
                <p className="text-[10px] tracking-widest text-[var(--sl-text-30)] mt-0.5">
                  STEP {step} OF 2 — {step === 1 ? 'ACCOUNT' : 'PLAYER PROFILE'}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--sl-text-40)] hover:text-[var(--sl-text)] hover:bg-[var(--sl-surface-hover)] transition text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ── Email confirmed success ── */}
          {done ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[var(--sl-accent-15)] flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-[var(--sl-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--sl-text)] font-bold tracking-wider">CHECK YOUR EMAIL</p>
                <p className="text-[var(--sl-text-40)] text-sm mt-2 leading-relaxed">
                  We sent a confirmation link to <span className="text-[var(--sl-text-60)]">{s1.email}</span>.<br />
                  Click it to activate your account and sign in.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold text-xs tracking-widest hover:bg-[var(--sl-accent-hover)] transition"
              >
                GOT IT
              </button>
            </div>
          ) : step === 1 ? (

            /* ── STEP 1: Account ── */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>FIRST NAME <span className="text-[var(--sl-accent)]">*</span></label>
                  <input type="text" value={s1.firstName} onChange={set1('firstName')}
                    placeholder="Jane" autoComplete="given-name" className={inp} />
                </div>
                <div>
                  <label className={lbl}>LAST NAME <span className="text-[var(--sl-accent)]">*</span></label>
                  <input type="text" value={s1.lastName} onChange={set1('lastName')}
                    placeholder="Smith" autoComplete="family-name" className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>EMAIL <span className="text-[var(--sl-accent)]">*</span></label>
                <input type="email" value={s1.email} onChange={set1('email')}
                  placeholder="you@example.com" autoComplete="email" className={inp} />
              </div>

              <div>
                <label className={lbl}>PASSWORD <span className="text-[var(--sl-accent)]">*</span></label>
                <input type="password" value={s1.password} onChange={set1('password')}
                  placeholder="Minimum 8 characters" autoComplete="new-password" className={inp} />
              </div>

              <div>
                <label className={lbl}>CONFIRM PASSWORD <span className="text-[var(--sl-accent)]">*</span></label>
                <input type="password" value={s1.confirmPassword} onChange={set1('confirmPassword')}
                  placeholder="••••••••" autoComplete="new-password" className={inp} />
              </div>
            </div>

          ) : (

            /* ── STEP 2: Player Profile ── */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>GENDER</label>
                  <select value={s2.gender} onChange={set2sel('gender')} className={sel}>
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>DATE OF BIRTH</label>
                  <input type="date" value={s2.dob} onChange={set2inp('dob')}
                    className={inp} style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>HANDEDNESS</label>
                  <select value={s2.handedness} onChange={set2sel('handedness')} className={sel}>
                    <option value="">Select…</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>PHONE (OPTIONAL)</label>
                  <input type="tel" value={s2.phone} onChange={set2inp('phone')}
                    placeholder="+1 555 000 0000" autoComplete="tel" className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>COUNTRY</label>
                  <select value={s2.country} onChange={handleCountryChange} className={sel}>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{s2.country === 'United States' ? 'STATE' : 'PROVINCE / REGION'}</label>
                  {provinces.length > 0 ? (
                    <select value={s2.province} onChange={set2sel('province')} className={sel}>
                      <option value="">Select…</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={s2.province}
                      onChange={set2inp('province')}
                      placeholder="Optional" className={inp} />
                  )}
                </div>
              </div>

              {/* ── Home Club — searchable dropdown ── */}
              <div ref={clubRef}>
                <label className={lbl}>HOME CLUB</label>

                {clubFreeText ? (
                  /* Free text fallback */
                  <div>
                    <input
                      type="text"
                      value={s2.homeClub}
                      onChange={set2inp('homeClub')}
                      placeholder="Enter your club name"
                      autoComplete="off"
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={() => { setClubFreeText(false); setClubQuery(s2.homeClub); setClubOpen(true) }}
                      className="text-[10px] text-[var(--sl-accent-60)] hover:text-[var(--sl-accent)] transition mt-1.5 block"
                    >
                      ← Search the list instead
                    </button>
                  </div>
                ) : (
                  /* Search mode */
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={clubInputValue}
                        onChange={e => {
                          setClubQuery(e.target.value)
                          setClubOpen(true)
                          setS2(p => ({ ...p, homeClub: '', noHomeClub: false }))
                        }}
                        onFocus={() => {
                          setClubQuery(s2.noHomeClub ? '' : s2.homeClub)
                          setClubOpen(true)
                        }}
                        placeholder={clubInputPlaceholder}
                        autoComplete="off"
                        className={`${inp} pr-8 ${s2.noHomeClub ? 'text-[var(--sl-text-30)]' : ''}`}
                      />
                      {(s2.homeClub || s2.noHomeClub) && !clubOpen && (
                        <button
                          type="button"
                          onClick={clearClub}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sl-text-30)] hover:text-[var(--sl-text)] transition text-base leading-none"
                          aria-label="Clear selection"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Dropdown — inline so modal scroll handles it */}
                    {clubOpen && (
                      <div className="mt-1 rounded-lg border border-[var(--sl-border)] bg-[var(--sl-surface-deep)] overflow-hidden">
                        {/* No Home Club — top */}
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={selectNoHomeClub}
                          className="w-full text-left px-4 py-2.5 text-sm text-[var(--sl-text-40)] hover:bg-[var(--sl-surface-hover)] transition border-b border-[var(--sl-border)] flex items-center gap-2"
                        >
                          <span className="text-[var(--sl-text-20)] font-bold">—</span>
                          No Home Club
                        </button>

                        {/* Results */}
                        <div className="max-h-44 overflow-y-auto">
                          {clubResults.length > 0 ? (
                            clubResults.map((club, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => selectClub(club)}
                                className="w-full text-left px-4 py-2.5 hover:bg-[var(--sl-surface-hover)] transition"
                              >
                                <span className="text-sm text-[var(--sl-text)]">{club.name}</span>
                                <span className="text-xs text-[var(--sl-text-30)] ml-1.5">— {club.city}, {club.region}</span>
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-3 text-sm text-[var(--sl-text-30)]">No clubs found</p>
                          )}
                        </div>

                        {/* My club isn't listed — bottom */}
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={selectFreeText}
                          className="w-full text-left px-4 py-2.5 text-sm text-[var(--sl-accent-60)] hover:bg-[var(--sl-surface-hover)] hover:text-[var(--sl-accent)] transition border-t border-[var(--sl-border)]"
                        >
                          + My club isn&apos;t listed — add it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* USR Rating + Division */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>USR / CL RATING (OPTIONAL)</label>
                  <input
                    type="number"
                    value={s2.usrRating}
                    onChange={handleRatingChange}
                    min={1.5} max={7.0} step={0.5}
                    placeholder="e.g. 4.0"
                    className={inp}
                  />
                  <p className="text-[9px] text-[var(--sl-text-20)] mt-1">Range: 1.5 – 7.0 in 0.5 steps</p>
                </div>
                <div>
                  <label className={lbl}>DIVISION</label>
                  <select value={s2.division} onChange={set2sel('division')} className={sel}>
                    <option value="">Select…</option>
                    {(['OPEN', 'A', 'B', 'C'] as const).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="D">D — Beginner</option>
                  </select>
                  {s2.usrRating && s2.division && (
                    <p className="text-[9px] text-[var(--sl-accent-60)] mt-1">
                      Auto-set from rating — you can override
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !done && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          {/* ── Checkboxes (step 2 only) ── */}
          {step === 2 && !done && (
            <div className="space-y-3 pt-2 border-t border-[var(--sl-border)]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeToS} onChange={e => setAgreeToS(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-[var(--sl-accent)]" />
                <span className="text-[11px] text-[var(--sl-text-40)] leading-relaxed">
                  I agree to the{' '}
                  <span className="text-[var(--sl-accent)] underline cursor-pointer">Terms of Service</span>
                  {' '}<span className="text-[var(--sl-accent)]">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-[var(--sl-accent)]" />
                <span className="text-[11px] text-[var(--sl-text-40)] leading-relaxed">
                  I agree to the{' '}
                  <span className="text-[var(--sl-accent)] underline cursor-pointer">Privacy Policy</span>
                  {' '}<span className="text-[var(--sl-accent)]">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-[var(--sl-accent)]" />
                <span className="text-[11px] text-[var(--sl-text-30)] leading-relaxed">
                  Send me tournament announcements and updates (optional)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 pb-6 pt-4 border-t border-[var(--sl-border)] shrink-0">
            {step === 1 ? (
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-xl border border-[var(--sl-border)] text-[var(--sl-text-40)] text-xs font-semibold tracking-widest hover:border-[var(--sl-text-20)] hover:text-[var(--sl-text-60)] transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleNext}
                  className="flex-[2] py-3 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition"
                >
                  NEXT: PROFILE →
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(null) }}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-[var(--sl-border)] text-[var(--sl-text-40)] text-xs font-semibold tracking-widest hover:border-[var(--sl-text-20)] hover:text-[var(--sl-text-60)] transition disabled:opacity-50"
                >
                  ← BACK
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] py-3 rounded-xl bg-[var(--sl-accent)] text-[var(--sl-btn-text)] font-bold tracking-widest text-sm hover:bg-[var(--sl-accent-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
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
