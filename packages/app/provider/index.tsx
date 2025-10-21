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
  const initRef = useRef(false)
  useEffect(() => {
    // Double guard: both module-level and ref-level
    if (providerInitialized || initRef.current) {
      return
    }
    initRef.current = true
    providerInitialized = true

    const startTime = Date.now()
    log.info('Provider', 'Starting initialization')

    useAuthStore
      .getState()
      .initialize()
      .then(() => {
        const duration = Date.now() - startTime
        log.info('Provider', 'Auth initialized', { duration })
      })
      .catch((error) => {
        log.error('Provider', 'Auth store initialization failed', { error })
      })

    useFeatureFlagsStore.getState().loadFlags()

    // Initialize test auth after auth store is ready
    initializeTestAuth()

    // Setup video history cache cleanup on logout
    const {
      setupVideoHistoryCacheCleanup,
    } = require('../features/HistoryProgress/stores/videoHistory')
    const unsubscribe = setupVideoHistoryCacheCleanup(useAuthStore)

    return () => {
      unsubscribe()
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
