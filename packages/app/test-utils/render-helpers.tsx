import { config } from '@my/config'
import { TamaguiProvider } from '@my/ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type React from 'react'

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & {
    queryClient?: QueryClient
  } = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TamaguiProvider config={config}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TamaguiProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Create a test query client with sensible defaults
export function createTestQueryClient() {
  return new QueryClient({
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
}

// Helper for testing error boundaries
export function ThrowError({
  shouldThrow,
  message = 'Test error',
}: {
  shouldThrow: boolean
  message?: string
}) {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div data-testid="no-error">No error</div>
}
