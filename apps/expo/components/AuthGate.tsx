import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import { usePathname, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'

export interface AuthGateProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * AuthGate - Route protection component for Expo Router
 *
 * Protects child routes by:
 * - Showing loading state while auth is initializing
 * - Redirecting unauthenticated users to sign-in
 * - Rendering children only when user is authenticated
 * - Preserving intended destination for post-auth redirect
 *
 * Optimized with Zustand selectors to minimize rerenders
 */
export function AuthGate({ children, redirectTo = '/auth/sign-in', fallback }: AuthGateProps) {
  // Use Zustand selectors with shallow equality to prevent unnecessary rerenders
  const isAuthenticated = useAuthStore((state) => !!(state.user && state.session))
  const loading = useAuthStore((state) => state.loading)
  const initialized = useAuthStore((state) => state.initialized)

  const router = useRouter()
  const pathname = usePathname()

  // Check if current route is an auth route (should be accessible without authentication)
  const isAuthRoute = pathname.startsWith('/auth')

  // Log deduplication ref - must be called unconditionally at component level
  const lastLoggedKeyRef = useRef<string>('')

  // Log deduplication helper to prevent spam of the same transition
  const logOnce = (key: string, fn: () => void) => {
    if (lastLoggedKeyRef.current !== key) {
      lastLoggedKeyRef.current = key
      fn()
    }
  }

  useEffect(() => {
    // Only redirect after auth is initialized and user is not authenticated
    // Skip redirect if we're already on an auth route
    if (initialized && !loading && !isAuthenticated && !isAuthRoute) {
      log.info('AuthGate', 'User not authenticated, redirecting to sign-in', {
        redirectTo,
      })

      // Use replace to avoid adding to navigation stack
      router.replace(redirectTo as any)
    }
  }, [initialized, loading, isAuthenticated, redirectTo, router, isAuthRoute])

  // Allow auth routes to pass through without authentication check
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <GlassBackground
        backgroundColor="$color3"
        testID="auth-gate-loading-fallback"
      >
        <StateDisplay
          type="loading"
          title="This too shall pass..."
          testID="auth-gate-loading-state"
        />
      </GlassBackground>
    )
  }

  // Don't render children if not authenticated (redirect will happen)
  // Return dark background to prevent white flash during redirect
  if (!isAuthenticated) {
    logOnce('not-authenticated', () =>
      log.info('AuthGate', 'User not authenticated, not rendering children')
    )
    return <View style={{ flex: 1, backgroundColor: '#363636' }} />
  }

  // User is authenticated, render protected content
  logOnce('authenticated', () =>
    log.debug('AuthGate', 'Rendering protected route', {
      pathname,
    })
  )
  return <>{children}</>
}
