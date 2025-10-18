import { useAuth } from '@my/app/hooks/useAuth'
import { log } from '@my/logging'
import { H3, Spinner, YStack } from '@my/ui'
import { usePathname, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'

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
 */
export function AuthGate({ children, redirectTo = '/auth/sign-in', fallback }: AuthGateProps) {
  const { isAuthenticated, loading, initialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Check if current route is an auth route (should be accessible without authentication)
  const isAuthRoute = pathname.startsWith('/auth')

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    log.debug('AuthGate', 'Render', { isAuthenticated, loading, initialized })
  }

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
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      log.debug('AuthGate', 'Auth initializing, showing loading state', {
        initialized,
        loading,
      })
    }

    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        gap="$4"
        backgroundColor="$background"
      >
        <Spinner size="large" />
        <H3 color="$color10">Loading...</H3>
      </YStack>
    )
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    logOnce('not-authenticated', () =>
      log.info('AuthGate', 'User not authenticated, not rendering children')
    )
    return null
  }

  // User is authenticated, render protected content
  logOnce('authenticated', () =>
    log.info('AuthGate', 'User authenticated, rendering protected content')
  )
  return <>{children}</>
}
