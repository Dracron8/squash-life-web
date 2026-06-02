import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  // Validate next param — only allow same-origin relative paths (prevent open redirect)
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const safePath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  // OAuth provider returned an error (e.g. user denied access)
  if (oauthError) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(oauthError)}`)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${safePath}`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`)
}
