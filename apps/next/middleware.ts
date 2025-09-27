import { log } from '@my/logging'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Middleware for authentication route protection
 *
 * Protects routes by:
 * - Checking for valid Supabase auth session
 * - Redirecting unauthenticated users to sign-in
 * - Allowing public routes (auth pages, API routes, static assets)
 * - Preserving intended destination for post-auth redirect
 */

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/api',
  '/_next',
  '/favicon.ico',
  '/vercel.svg',
  '/models',
  '/tamagui.css',
]

// Check if route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get Supabase URL and key from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    log.error('middleware', 'Missing Supabase environment variables in middleware')
    return NextResponse.next()
  }

  try {
    // Create Supabase client for server-side auth check
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get session from request cookies
    const token = request.cookies.get('sb-access-token')?.value
    const refreshToken = request.cookies.get('sb-refresh-token')?.value

    if (!token) {
      // No token found, redirect to sign-in
      const signInUrl = new URL('/auth/sign-in', request.url)
      signInUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Verify the session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      // Invalid token, redirect to sign-in
      const signInUrl = new URL('/auth/sign-in', request.url)
      signInUrl.searchParams.set('redirectTo', pathname)

      // Clear invalid cookies
      const response = NextResponse.redirect(signInUrl)
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')

      return response
    }

    // User is authenticated, allow request to proceed
    return NextResponse.next()
  } catch (error) {
    log.error('middleware', 'Middleware auth check failed', { error })

    // On error, redirect to sign-in to be safe
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(signInUrl)
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|vercel.svg|models|tamagui.css).*)',
  ],
}
