import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <nav className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40 bg-neutral-950">
        <div className="flex items-center gap-6">
          <Link href="/td" className="flex items-center gap-2">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-7 w-auto" />
          </Link>
          <span className="text-neutral-700">|</span>
          <Link href="/td" className="text-xs font-bold tracking-widest text-neutral-400 hover:text-white transition">
            MY TOURNAMENTS
          </Link>
          <Link href="/td/tournaments/new" className="text-xs font-bold tracking-widest text-red-500 hover:text-red-400 transition">
            + NEW
          </Link>
        </div>
        <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-300 transition">
          Player Dashboard →
        </Link>
      </nav>
      {children}
    </div>
  )
}
