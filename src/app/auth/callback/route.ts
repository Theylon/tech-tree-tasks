import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('[AUTH CALLBACK] Route hit')

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  console.log('[AUTH CALLBACK] code present:', !!code)
  console.log('[AUTH CALLBACK] origin:', origin)
  console.log('[AUTH CALLBACK] next:', next)

  if (code) {
    console.log('[AUTH CALLBACK] Creating Supabase client...')
    const supabase = await createClient()

    console.log('[AUTH CALLBACK] Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[AUTH CALLBACK] Exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log('[AUTH CALLBACK] Exchange successful!')
    console.log('[AUTH CALLBACK] User:', data.user?.email)
    console.log('[AUTH CALLBACK] Session exists:', !!data.session)

    const redirectUrl = `${origin}${next}`
    console.log('[AUTH CALLBACK] Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  }

  console.log('[AUTH CALLBACK] No code provided')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
