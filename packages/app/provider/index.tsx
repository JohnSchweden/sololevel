import { TamaguiProvider, type TamaguiProviderProps, ToastProvider, config } from '@my/ui'
import { useEffect } from 'react'
import { Platform, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuthStore } from '../stores/auth'
import { useFeatureFlagsStore } from '../stores/feature-flags'
import { I18nProvider } from './I18nProvider'
import { QueryProvider } from './QueryProvider'
import { ToastViewport } from './ToastViewport'

export function Provider({
  children,
  defaultTheme = 'light',
  locale,
  ...rest
}: Omit<TamaguiProviderProps, 'config'> & {
  defaultTheme?: string
  locale?: string
}) {
  const colorScheme = useColorScheme()
  const theme = defaultTheme || (colorScheme === 'dark' ? 'dark' : 'light')

  // Initialize stores once
  useEffect(() => {
    useAuthStore.getState().initialize()
    useFeatureFlagsStore.getState().loadFlags()
  }, [])

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
                {children}
                <ToastViewport />
              </ToastProvider>
            </ErrorBoundary>
          </TamaguiProvider>
        </QueryProvider>
      </I18nProvider>
    </SafeAreaProvider>
  )
}
