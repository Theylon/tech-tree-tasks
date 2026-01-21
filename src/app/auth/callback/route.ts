import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[AUTH CALLBACK] Route hit')

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/projects'

  console.log('[AUTH CALLBACK] code present:', !!code)
  console.log('[AUTH CALLBACK] origin:', origin)
  console.log('[AUTH CALLBACK] next:', next)
  console.log('[AUTH CALLBACK] Cookies in request:', request.cookies.getAll().map(c => c.name).join(', '))

  if (!code) {
    console.log('[AUTH CALLBACK] No code provided')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // Create the redirect response first
  const redirectUrl = `${origin}${next}`
  const response = NextResponse.redirect(redirectUrl)

  console.log('[AUTH CALLBACK] Creating Supabase client...')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          console.log('[AUTH CALLBACK] setAll called with', cookiesToSet.length, 'cookies')
          cookiesToSet.forEach(({ name, value, options }) => {
            console.log('[AUTH CALLBACK] Setting cookie:', name, 'value length:', value?.length, 'options:', JSON.stringify(options))
            try {
              // Set cookie with explicit options to ensure it works
              response.cookies.set({
                name,
                value,
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: true,
              })
              console.log('[AUTH CALLBACK] Cookie set successfully:', name)
            } catch (err) {
              console.error('[AUTH CALLBACK] Error setting cookie:', name, err)
            }
          })
        },
      },
    }
  )

  console.log('[AUTH CALLBACK] Exchanging code for session...')
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[AUTH CALLBACK] Exchange error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  console.log('[AUTH CALLBACK] Exchange successful!')
  console.log('[AUTH CALLBACK] User:', data.user?.email)
  console.log('[AUTH CALLBACK] Session exists:', !!data.session)
  console.log('[AUTH CALLBACK] Cookies on response:', response.cookies.getAll().map(c => c.name).join(', '))
  console.log('[AUTH CALLBACK] Redirecting to:', redirectUrl)

  return response
}
