import { useColorScheme } from 'react-native'
import { useEffect } from 'react'
import { TamaguiProvider, type TamaguiProviderProps, ToastProvider, config } from '@my/ui'
import { ToastViewport } from './ToastViewport'
import { QueryProvider } from './QueryProvider'
import { I18nProvider } from './I18nProvider'
import { useAuthStore } from '../stores/auth'
import { useFeatureFlagsStore } from '../stores/feature-flags'
import { ErrorBoundary } from '../components/ErrorBoundary'

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
    <ErrorBoundary>
      <I18nProvider locale={locale}>
        <QueryProvider>
          <TamaguiProvider
            config={config}
            defaultTheme={theme}
            {...rest}
          >
            <ToastProvider
              swipeDirection="horizontal"
              duration={6000}
              native={[]}
            >
              {children}
              <ToastViewport />
            </ToastProvider>
          </TamaguiProvider>
        </QueryProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}
