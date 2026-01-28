// Platform-specific ActionSheet provider - loaded dynamically to avoid module evaluation issues
const getActionSheetProvider = () => {
  try {
    // Try to load ActionSheetProvider - this will work on React Native
    const { ActionSheetProvider } = require('@expo/react-native-action-sheet')
    return ActionSheetProvider
  } catch {
    // Fallback for web or when package is not available
    return ({ children }: { children: React.ReactNode }) => children
  }
}
import { supabase } from '@my/api'
import { log } from '@my/logging'
import { TamaguiProvider, type TamaguiProviderProps, ToastProvider, config } from '@my/ui'
import { focusManager } from '@tanstack/react-query'
import { enableMapSet } from 'immer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, type AppStateStatus, Platform, View, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initializeTestAuth } from '../auth/testAuthBootstrap'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuthStore } from '../stores/auth'
import { useFeatureFlagsStore } from '../stores/feature-flags'
import {
  cleanupVoicePreferencesAuthSync,
  initializeVoicePreferencesAuthSync,
} from '../stores/voicePreferences'
import { I18nProvider } from './I18nProvider'
import { QueryProvider } from './QueryProvider'
import { ToastViewport } from './ToastViewport'

/**
 * Setup AppState listener for React Native to handle background/foreground transitions.
 * This is CRITICAL for:
 * 1. Refreshing auth tokens when app returns from background
 * 2. Enabling TanStack Query's refetchOnWindowFocus on React Native
 *
 * Without this, users get logged out when they lock their phone and come back.
 */
function useAppStateRefresh() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    // Skip on web - window focus events work natively there
    if (Platform.OS === 'web') return

    // Setup TanStack Query focus manager for React Native
    // This makes refetchOnWindowFocus work on mobile
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      const isNowActive = nextState === 'active'

      if (wasBackground && isNowActive) {
        log.debug('Provider', 'App returned to foreground, refreshing session')

        // 1. Tell TanStack Query the window is focused (triggers refetchOnWindowFocus)
        focusManager.setFocused(true)

        // 2. Refresh Supabase auth session
        // This catches expired tokens that occurred while app was suspended
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            log.warn('Provider', 'Session refresh on foreground failed', { error: error.message })
          } else if (session) {
            // Update auth store with refreshed session
            useAuthStore.getState().setAuth(session.user, session)
            log.debug('Provider', 'Session refreshed on foreground', {
              userId: session.user.id.slice(0, 8),
              expiresIn: session.expires_at
                ? Math.round((session.expires_at * 1000 - Date.now()) / 1000)
                : null,
            })
          } else {
            // No session - user was logged out while backgrounded
            log.info('Provider', 'No session on foreground - user logged out')
            useAuthStore.getState().setAuth(null, null)
          }
        })
      } else if (nextState.match(/inactive|background/)) {
        // App going to background - mark as unfocused
        focusManager.setFocused(false)
      }

      appStateRef.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [])
}

// Module-level flag to ensure initialization runs only once across all Provider instances
let providerInitialized = false

export function Provider({
  children,
  defaultTheme = 'dark',
  locale,
  onRootViewReady,
  ...rest
}: Omit<TamaguiProviderProps, 'config'> & {
  defaultTheme?: string
  locale?: string
  onRootViewReady?: () => void
}) {
  // Initialize Immer MapSet plugin for Zustand stores that use Map/Set objects
  useEffect(() => {
    enableMapSet()
  }, [])

  // Handle app background/foreground transitions - refresh auth + TanStack Query focus
  useAppStateRefresh()

  const colorScheme = useColorScheme()
  const theme = colorScheme === 'dark' ? 'dark' : defaultTheme || 'dark'

  // Ensure ActionSheetProvider is only rendered on client to avoid hydration mismatches
  const [mounted, setMounted] = useState(false)
  const [ActionSheetProvider, setActionSheetProvider] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    setActionSheetProvider(() => getActionSheetProvider())
  }, [])

  // Initialize stores and test auth once - use module-level flag to prevent duplicate initialization
  // across all Provider instances (handles React Strict Mode + multiple mounts)
  // DEFERRED: Run after first render to avoid blocking UI initialization
  const initRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Double guard: both module-level and ref-level
    if (providerInitialized || initRef.current) {
      return
    }
    initRef.current = true
    providerInitialized = true

    // Defer initialization significantly - allows UI to render and become interactive first
    // Critical for app launch performance: defers auth check until after first paint
    // Use longer delay to ensure UI is fully rendered before starting auth check
    const initTimer = setTimeout(() => {
      const startTime = Date.now()
      log.info('Provider', 'Starting deferred initialization')

      // Auth initialization - non-blocking, runs after UI is interactive
      useAuthStore
        .getState()
        .initialize()
        .then(() => {
          const durationMs = Date.now() - startTime
          log.info('Provider', 'Auth initialized', { durationMs })

          // Initialize voice preferences sync on login
          initializeVoicePreferencesAuthSync()
        })
        .catch((error) => {
          log.error('Provider', 'Auth store initialization failed', { error })
        })

      // Feature flags - fast, synchronous env var reads
      useFeatureFlagsStore.getState().loadFlags()

      // Initialize test auth after auth store is ready (if enabled)
      initializeTestAuth()

      // VideoHistory hydration: async import then trigger hydration
      // Note: Store may already exist due to static imports, but skipHydration defers MMKV read
      import('../features/HistoryProgress/stores/videoHistory')
        .then((module) => {
          // Setup auth-based cache cleanup
          const unsubscribe = module.setupVideoHistoryCacheCleanup(useAuthStore)
          cleanupRef.current = unsubscribe

          // Trigger hydration (reads from MMKV)
          module.useVideoHistoryStore.getState().ensureHydrated()
          log.debug('Provider', 'VideoHistoryStore hydration complete')
        })
        .catch((error) => {
          log.warn('Provider', 'Failed to setup video history', { error })
        })
    }, 200) // 200ms delay - allows UI to render and become interactive before auth check

    return () => {
      clearTimeout(initTimer)
      cleanupVoicePreferencesAuthSync()
      // Call cleanup if it was set
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      // Don't reset module-level flag - we want singleton behavior
      // Only reset ref for this component instance
      initRef.current = false
    }
  }, [])

  // Add test hook for Immer MapSet plugin verification (development only)
  if (__DEV__) {
    // This will be used by tests to verify MapSet plugin is enabled
    ;(global as any).__immerMapSetEnabled = true
  }

  // Debug hook placeholder (no console in linted builds)
  useEffect(() => {
    // noop: native toast disabled by config
  }, [])

  // Memoize root background style to prevent object recreation on each render
  // Matches splash screen backgroundColor (#1a1a1a) for seamless transition
  const rootBackgroundStyle = useMemo(() => ({ flex: 1, backgroundColor: '#1a1a1a' }), [])

  return (
    <SafeAreaProvider
      initialMetrics={
        Platform.OS === 'web'
          ? {
              frame: { x: 0, y: 0, width: 0, height: 0 },
              insets: { top: 0, left: 0, right: 0, bottom: 0 },
            }
          : undefined
      }
    >
      {/* Root background wrapper to prevent white flash between splash screen and AuthGate fallback */}
      <View
        style={rootBackgroundStyle}
        onLayout={() => {
          // Notify parent that root view is ready - allows delaying splash screen hide
          onRootViewReady?.()
        }}
      >
        <I18nProvider locale={locale}>
          <QueryProvider>
            <TamaguiProvider
              config={config}
              defaultTheme={theme}
              {...rest}
            >
              <ErrorBoundary>
                <ToastProvider
                  swipeDirection="horizontal"
                  duration={6000}
                  native={[]}
                >
                  {mounted && ActionSheetProvider ? (
                    <ActionSheetProvider>
                      <>
                        {children}
                        <ToastViewport />
                      </>
                    </ActionSheetProvider>
                  ) : (
                    <>
                      {children}
                      <ToastViewport />
                    </>
                  )}
                </ToastProvider>
              </ErrorBoundary>
            </TamaguiProvider>
          </QueryProvider>
        </I18nProvider>
      </View>
    </SafeAreaProvider>
  )
}
