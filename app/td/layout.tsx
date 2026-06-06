// TD Layout — server component
// Guards all /td/* routes: user must be logged in + have user_role 'td' or 'both'
// Note: schema uses profiles.user_role, not players.is_td (that field does not exist)

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  return <>{children}</>
}
