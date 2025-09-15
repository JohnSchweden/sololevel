/**
 * Enhanced Test Provider for Tamagui Components
 * Provides consistent test environment setup with customizable options
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RenderOptions, render } from '@testing-library/react'
import React from 'react'
import { TamaguiProvider } from 'tamagui'
import config from '../config/tamagui.config'

// Lazy load react-native render to avoid issues in web environments
let renderNative: any = null
const getRenderNative = () => {
  if (!renderNative) {
    try {
      renderNative = require('@testing-library/react-native').render
    } catch {
      // Not in a React Native environment
    }
  }
  return renderNative
}

export interface TestProviderProps {
  children: React.ReactNode
  config?: typeof config
  theme?: 'light' | 'dark' | 'auto'
  locale?: string
  disableAnimations?: boolean
  queryClient?: QueryClient
}

export interface RenderWithProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  config?: typeof config
  theme?: 'light' | 'dark' | 'auto'
  locale?: string
  disableAnimations?: boolean
  queryClient?: QueryClient
}

/**
 * Enhanced TestProvider component with customizable options
 * Supports theme overrides, custom config, and animation disabling
 */
// Create a test query client
const createTestQueryClient = (customQueryClient?: QueryClient) =>
  customQueryClient ||
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

export function TestProvider({
  children,
  config: customConfig = config,
  //theme = 'light',
  //locale = 'en',
  disableAnimations = true,
  queryClient,
}: TestProviderProps) {
  // Create a test-friendly config
  const testConfig = {
    ...customConfig,
    // Disable animations in tests for consistent behavior
    animations: disableAnimations
      ? {
          ...customConfig.animations,
          enabled: false,
        }
      : customConfig.animations,
  }

  const testQueryClient = createTestQueryClient(queryClient)

  return (
    <QueryClientProvider client={testQueryClient}>
      <TamaguiProvider config={testConfig}>{children}</TamaguiProvider>
    </QueryClientProvider>
  )
}

/**
 * Enhanced render function with TestProvider wrapper and customization options
 * Use this instead of render() from @testing-library/react in test files
 */
export function renderWithProvider(
  component: React.ReactElement,
  options: RenderWithProviderOptions = {}
) {
  const {
    config: customConfig,
    theme,
    locale,
    disableAnimations,
    queryClient,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProvider
      config={customConfig}
      theme={theme}
      locale={locale}
      disableAnimations={disableAnimations}
      queryClient={queryClient}
    >
      {children}
    </TestProvider>
  )

  return render(component, {
    ...renderOptions,
    wrapper: Wrapper,
  })
}

/**
 * Utility function to create a custom TestProvider for specific test scenarios
 */
export function createTestProvider(options: Omit<TestProviderProps, 'children'>) {
  return function CustomTestProvider({ children }: { children: React.ReactNode }) {
    return <TestProvider {...options}>{children}</TestProvider>
  }
}

/**
 * Hook for creating render functions with pre-configured options
 */
export function createRenderWithProvider(defaultOptions: RenderWithProviderOptions = {}) {
  return (component: React.ReactElement, options: RenderWithProviderOptions = {}) => {
    return renderWithProvider(component, { ...defaultOptions, ...options })
  }
}

/**
 * Native render function with TestProvider wrapper for React Native tests
 * Automatically detects and uses @testing-library/react-native
 */
export function renderWithProviderNative(
  component: React.ReactElement,
  options: RenderWithProviderOptions = {}
) {
  const renderFn = getRenderNative()
  if (!renderFn) {
    throw new Error(
      'renderWithProviderNative requires @testing-library/react-native to be installed'
    )
  }

  const {
    config: customConfig,
    theme,
    locale,
    disableAnimations,
    queryClient,
    ...renderOptions
  } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProvider
      config={customConfig}
      theme={theme}
      locale={locale}
      disableAnimations={disableAnimations}
      queryClient={queryClient}
    >
      {children}
    </TestProvider>
  )

  return renderFn(component, {
    ...renderOptions,
    wrapper: Wrapper,
  })
}

/**
 * Pre-configured render functions for common test scenarios
 */
export const renderWithDarkTheme = createRenderWithProvider({ theme: 'dark' })
export const renderWithAnimations = createRenderWithProvider({ disableAnimations: false })
export const renderWithoutAnimations = createRenderWithProvider({ disableAnimations: true })

/**
 * Test utilities for common testing patterns
 */
export const testUtils = {
  /**
   * Wait for component to finish mounting and effects
   */
  waitForMount: () => new Promise((resolve) => setTimeout(resolve, 0)),

  /**
   * Create a test ID generator for consistent test IDs
   */
  createTestId: (prefix: string) => (suffix?: string) => (suffix ? `${prefix}-${suffix}` : prefix),

  /**
   * Common test screen sizes for responsive testing
   */
  screenSizes: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
  },

  /**
   * Common user interaction helpers
   */
  interactions: {
    press: (element: HTMLElement) => {
      element.click()
    },
    longPress: (element: HTMLElement) => {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      setTimeout(() => {
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      }, 500)
    },
  },
}
