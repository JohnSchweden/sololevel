import { hasUserSetVoicePreferences } from '@my/api'
import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import { usePathname, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
 * - Redirecting users without voice preferences to onboarding
 * - Rendering children only when user is authenticated and onboarded
 * - Preserving intended destination for post-auth redirect
 *
 * Optimized with Zustand selectors to minimize rerenders
 */
export function AuthGate({ children, redirectTo = '/auth/sign-in', fallback }: AuthGateProps) {
  // Use Zustand selectors with shallow equality to prevent unnecessary rerenders
  const isAuthenticated = useAuthStore((state) => !!(state.user && state.session))
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const initialized = useAuthStore((state) => state.initialized)

  const router = useRouter()
  const pathname = usePathname()

  // Track voice preferences check state
  const [checkingVoicePrefs, setCheckingVoicePrefs] = useState(false)
  const voicePrefsCheckedRef = useRef(false)

  // Check if current route is an auth or onboarding route (should be accessible without full onboarding)
  const isAuthRoute = pathname.startsWith('/auth')
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // Log deduplication ref - must be called unconditionally at component level
  const lastLoggedKeyRef = useRef<string>('')

  // Log deduplication helper to prevent spam of the same transition
  const logOnce = (key: string, fn: () => void) => {
    if (lastLoggedKeyRef.current !== key) {
      lastLoggedKeyRef.current = key
      fn()
    }
  }

  // Effect 1: Check authentication
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

  // Effect 2: Check voice preferences for authenticated users
  useEffect(() => {
    const shouldCheck =
      isAuthenticated &&
      initialized &&
      !loading &&
      !checkingVoicePrefs &&
      !voicePrefsCheckedRef.current &&
      !isAuthRoute &&
      !isOnboardingRoute &&
      user?.id

    if (!shouldCheck) return

    const checkVoicePreferences = async () => {
      setCheckingVoicePrefs(true)
      voicePrefsCheckedRef.current = true

      try {
        const hasPreferences = await hasUserSetVoicePreferences(user.id)
        if (!hasPreferences) {
          log.info('AuthGate', 'User has no voice preferences, redirecting to voice selection', {
            userId: user.id,
          })
          router.replace('/onboarding/voice-selection' as any)
        } else {
          log.debug('AuthGate', 'User has voice preferences, allowing access')
        }
      } catch (error) {
        log.error('AuthGate', 'Failed to check voice preferences, allowing access as fallback', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.id,
        })
      } finally {
        setCheckingVoicePrefs(false)
      }
    }

    checkVoicePreferences()
  }, [
    isAuthenticated,
    initialized,
    loading,
    checkingVoicePrefs,
    isAuthRoute,
    isOnboardingRoute,
    user?.id,
    router,
  ])

  // Allow auth routes to pass through without authentication check
  if (isAuthRoute) {
    return <>{children}</>
  }

  // Show loading state while auth is initializing
  // PERF: Only show spinner if we're genuinely waiting (not about to redirect)
  // This prevents Tamagui Spinner's Animated values from firing updates after unmount
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

  // Don't render children if not authenticated (redirect will happen in useEffect)
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
