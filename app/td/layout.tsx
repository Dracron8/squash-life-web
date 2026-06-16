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
    <div data-td-light className="min-h-screen bg-white text-neutral-900">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-white shadow-sm">
        <div className="flex items-center gap-8">
          <Link href="/td" className="flex items-center">
            <img src="/sqshLIFE-logo.png" alt="SQSH.LIFE" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/td" className="text-xs font-black tracking-widest text-gray-600 hover:text-gray-900 transition-colors">
              MY TOURNAMENTS
            </Link>
            <Link href="/td/tournaments/new" className="text-xs font-black tracking-widest text-red-600 hover:text-red-700 transition-colors">
              + NEW
            </Link>
          </div>
        </div>
        <Link href="/dashboard" className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
          Player Dashboard →
        </Link>
      </nav>
      {children}
    </div>
  )
}
