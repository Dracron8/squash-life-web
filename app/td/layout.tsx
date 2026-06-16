import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export default async function TDLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || (profile.user_role !== 'td' && profile.user_role !== 'both')) {
    redirect('/dashboard')
  }

  return (
    <div data-td-light className="min-h-screen" style={{ backgroundColor: 'var(--sl-bg)', color: 'var(--sl-text)' }}>
      <nav style={{ borderBottom: '2px solid var(--sl-accent)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40, background: '#ffffff', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/td" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/sqshLIFE-logo.png" alt="SQSH.LIFE" height={36} width={120} style={{ width: 'auto', height: 36 }} />
          </Link>
          <span style={{ color: 'var(--sl-border)', userSelect: 'none' }}>|</span>
          <Link href="/td" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sl-text)', textDecoration: 'none', textTransform: 'uppercase' }}>
            My Tournaments
          </Link>
          <Link href="/td/tournaments/new" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sl-accent)', textDecoration: 'none', textTransform: 'uppercase' }}>
            + New
          </Link>
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--sl-text-50)', textDecoration: 'none' }}>
          Player Dashboard →
        </Link>
      </nav>
      {children}
    </div>
  )
}
