import { useAuthStore, wasVoicePrefsRecentlyChecked } from '@my/app/stores/auth'
import { useVoicePreferencesStore } from '@my/app/stores/voicePreferences'
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
 * - Redirecting users without voice preferences to onboarding
 * - Rendering children only when user is authenticated and onboarded
 * - Preserving intended destination for post-auth redirect
 *
 * Optimized with Zustand selectors to minimize rerenders
 */
export function AuthGate({ children, redirectTo = '/auth/sign-in', fallback }: AuthGateProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isAuthenticated = useAuthStore((state) => !!(state.user && state.session))
  const loading = useAuthStore((state) => state.loading)
  const initialized = useAuthStore((state) => state.initialized)

  const voicePrefsLoaded = useVoicePreferencesStore((state) => state.isLoaded)
  const hasSetPreferences = useVoicePreferencesStore((state) => state.hasSetPreferences)

  const voicePrefsCheckedRef = useRef(false)
  const lastLoggedKeyRef = useRef<string>('')

  const isAuthRoute = pathname.startsWith('/auth')
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  function logOnce(key: string, fn: () => void): void {
    if (lastLoggedKeyRef.current !== key) {
      lastLoggedKeyRef.current = key
      fn()
    }
  }

  useEffect(() => {
    if (initialized && !loading && !isAuthenticated && !isAuthRoute) {
      log.info('AuthGate', 'User not authenticated, redirecting to sign-in', {
        redirectTo,
      })
      router.replace(redirectTo as any)
    }
  }, [initialized, loading, isAuthenticated, redirectTo, router, isAuthRoute])

  useEffect(() => {
    const shouldCheck =
      isAuthenticated &&
      initialized &&
      !loading &&
      voicePrefsLoaded &&
      !voicePrefsCheckedRef.current &&
      !isAuthRoute &&
      !isOnboardingRoute &&
      !wasVoicePrefsRecentlyChecked()

    if (!shouldCheck) return

    voicePrefsCheckedRef.current = true
    useAuthStore.getState().markVoicePrefsChecked()

    if (!hasSetPreferences) {
      log.info('AuthGate', 'User has no voice preferences, redirecting to voice selection')
      router.replace('/onboarding/voice-selection' as any)
    } else {
      log.debug('AuthGate', 'User has voice preferences, allowing access')
    }
  }, [
    isAuthenticated,
    initialized,
    loading,
    voicePrefsLoaded,
    hasSetPreferences,
    isAuthRoute,
    isOnboardingRoute,
    router,
  ])

  if (isAuthRoute) {
    return <>{children}</>
  }

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

  if (!isAuthenticated) {
    logOnce('not-authenticated', () =>
      log.info('AuthGate', 'User not authenticated, not rendering children')
    )
    return <View style={{ flex: 1, backgroundColor: '#363636' }} />
  }

  logOnce('authenticated', () =>
    log.debug('AuthGate', 'Rendering protected route', {
      pathname,
    })
  )
  return <>{children}</>
}
