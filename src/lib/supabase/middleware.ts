import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[MIDDLEWARE] Path:', pathname)

  // Log cookies present
  const allCookies = request.cookies.getAll()
  console.log('[MIDDLEWARE] Cookies:', allCookies.map(c => c.name).join(', ') || 'none')

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          console.log('[MIDDLEWARE] setAll called with', cookiesToSet.length, 'cookies')
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getClaims() instead of getUser() or getSession()
  const { data, error } = await supabase.auth.getClaims()

  if (error) {
    console.log('[MIDDLEWARE] getClaims error:', error.message)
  }

  const user = data?.claims
  console.log('[MIDDLEWARE] User claims present:', !!user)

  // Protected routes
  const isProtectedRoute = pathname.startsWith('/projects') ||
    pathname.startsWith('/profile')

  if (isProtectedRoute && !user) {
    console.log('[MIDDLEWARE] Protected route, no user - redirecting to login')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login page
  if (pathname === '/login' && user) {
    console.log('[MIDDLEWARE] User logged in on login page - redirecting to projects')
    const url = request.nextUrl.clone()
    url.pathname = '/projects'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
