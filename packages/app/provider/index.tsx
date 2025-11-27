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
import { log } from '@my/logging'
import { TamaguiProvider, type TamaguiProviderProps, ToastProvider, config } from '@my/ui'
import { enableMapSet } from 'immer'
import { useEffect, useRef, useState } from 'react'
import { Platform, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initializeTestAuth } from '../auth/testAuthBootstrap'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuthStore } from '../stores/auth'
import { useFeatureFlagsStore } from '../stores/feature-flags'
import { I18nProvider } from './I18nProvider'
import { QueryProvider } from './QueryProvider'
import { ToastViewport } from './ToastViewport'

// Module-level flag to ensure initialization runs only once across all Provider instances
let providerInitialized = false

export function Provider({
  children,
  defaultTheme = 'dark',
  locale,
  ...rest
}: Omit<TamaguiProviderProps, 'config'> & {
  defaultTheme?: string
  locale?: string
}) {
  // Initialize Immer MapSet plugin for Zustand stores that use Map/Set objects
  useEffect(() => {
    enableMapSet()
  }, [])

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
  // Platform-agnostic timer type: NodeJS.Timeout on Node, number on web
  const innerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        })
        .catch((error) => {
          log.error('Provider', 'Auth store initialization failed', { error })
        })

      // Feature flags - fast, synchronous env var reads
      useFeatureFlagsStore.getState().loadFlags()

      // Initialize test auth after auth store is ready (if enabled)
      initializeTestAuth()

      // Defer video history store initialization until after UI is fully interactive
      // CRITICAL FIX: Prevents 507k allocations during critical startup path
      // Store will hydrate on-demand when user accesses history screen
      // FIX: Track inner timer ID to prevent cleanup leak if component unmounts early
      innerTimerRef.current = setTimeout(() => {
        innerTimerRef.current = null // Clear ref when timer fires
        import('../features/HistoryProgress/stores/videoHistory')
          .then((module) => {
            // Trigger hydration when user needs it (not at startup)
            const unsubscribe = module.setupVideoHistoryCacheCleanup(useAuthStore)
            cleanupRef.current = unsubscribe

            log.debug('Provider', 'VideoHistoryStore hydration deferred (on-demand)')
          })
          .catch((error) => {
            // Ignore errors - cleanup is optional, app should still function
            log.warn('Provider', 'Failed to setup video history cache cleanup', { error })
          })
      }, 1000) // Defer to 1 second after startup (vs previous 200ms immediate import)
    }, 200) // 200ms delay - allows UI to render and become interactive before auth check

    return () => {
      clearTimeout(initTimer)
      // FIX: Clear inner timer if it hasn't fired yet (prevents cleanup leak)
      if (innerTimerRef.current) {
        clearTimeout(innerTimerRef.current)
        innerTimerRef.current = null
      }
      // Call cleanup if it was set (even if component unmounts before inner timer fires)
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
    </SafeAreaProvider>
  )
}
