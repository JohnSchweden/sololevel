import { useAuth } from '@my/app/hooks/useAuth'
import { log } from '@my/logging'
import { H3, Spinner, YStack } from '@my/ui'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'

export interface AuthGateProps {
  children: React.ReactNode
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * AuthGate - Route protection component for Next.js with Expo Router
 *
 * Protects child routes by:
 * - Showing loading state while auth is initializing
 * - Redirecting unauthenticated users to sign-in
 * - Rendering children only when user is authenticated
 * - Preserving intended destination for post-auth redirect
 * - Working with Next.js middleware for server-side protection
 */
export function AuthGate({ children, redirectTo = '/auth/sign-in', fallback }: AuthGateProps) {
  const { isAuthenticated, loading, initialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect after auth is initialized and user is not authenticated
    if (initialized && !loading && !isAuthenticated) {
      log.info('AuthGate', 'User not authenticated, redirecting to sign-in', {
        redirectTo,
      })

      // Get current path for redirect after sign-in
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
      const signInUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`

      // Use replace to avoid adding to navigation stack
      router.replace(signInUrl as any)
    }
  }, [initialized, loading, isAuthenticated, redirectTo, router])

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    log.info('AuthGate', 'Auth initializing, showing loading state', {
      initialized,
      loading,
    })

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
        minHeight="100%"
      >
        <Spinner size="large" />
        <H3 color="$color10">Loading...</H3>
      </YStack>
    )
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    log.info('AuthGate', 'User not authenticated, not rendering children')
    return null
  }

  // User is authenticated, render protected content
  log.info('AuthGate', 'User authenticated, rendering protected content')
  return <>{children}</>
}
