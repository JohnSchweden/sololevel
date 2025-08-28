/**
 * Shared Test Utilities for UI Package
 * Centralized utilities for testing Tamagui components
 */

// Re-export commonly used testing library functions
export * from '@testing-library/react'
//export * from '@testing-library/jest-dom'

// Import types
import type { ReactElement } from 'react'
import type { TamaguiConfig } from 'tamagui'

// Re-export for convenience
export type { ReactElement, TamaguiConfig }

// Export all mock utilities
export * from './mocks'
export * from './TestProvider'
//export * from './setup'
export * from './mock-data'

// Re-export user event for advanced interactions
export { default as userEvent } from '@testing-library/user-event'

// Additional testing utilities
// Note: jest-dom matchers are automatically available when imported in setup files
