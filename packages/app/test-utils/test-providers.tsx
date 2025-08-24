import type React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TamaguiProvider } from '@my/ui'
import { config } from '@my/config'
import { I18nProvider } from '../provider/I18nProvider'

interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  locale?: string
}

// All-in-one test provider wrapper
export function TestProviders({ children, queryClient, locale = 'en' }: TestProvidersProps) {
  const testQueryClient =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })

  return (
    <TamaguiProvider config={config}>
      <QueryClientProvider client={testQueryClient}>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  )
}

// Minimal provider for unit tests
export function MinimalTestProvider({ children }: { children: React.ReactNode }) {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

// Query-only provider for API tests
export function QueryTestProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient?: QueryClient
}) {
  const testQueryClient =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })

  return <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
}
