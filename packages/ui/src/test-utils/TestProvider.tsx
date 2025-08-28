/**
 * Shared Test Provider for Tamagui Components
 * Provides consistent test environment setup
 */

import { render } from '@testing-library/react'
import React from 'react'
import { TamaguiProvider } from 'tamagui'
import config from '../config/tamagui.config'

export interface TestProviderProps {
  children: React.ReactNode
}

/**
 * TestProvider component that wraps children with TamaguiProvider
 * Use this in all test files to ensure consistent theming and configuration
 */
export function TestProvider({ children }: TestProviderProps) {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

/**
 * Render function that automatically wraps components with TestProvider
 * Use this instead of render() from @testing-library/react in test files
 */
export function renderWithProvider(component: React.ReactElement) {
  return render(<TestProvider>{component}</TestProvider>)
}
