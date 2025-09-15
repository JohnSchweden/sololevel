import React from 'react'

interface TestProvidersProps {
  children: React.ReactNode
}

export function TestProviders({ children }: TestProvidersProps) {
  // Just return children without any providers for now
  // The mocks in setup.ts should handle the provider requirements
  return <>{children}</>
}
