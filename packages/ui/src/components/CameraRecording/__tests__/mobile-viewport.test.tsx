/**
 * Mobile Viewport and Touch Target Tests
 * Tests component behavior at mobile viewport sizes (375px, 414px, 390px)
 * Validates 44px minimum touch targets as required
 */

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { TamaguiProvider } from '@tamagui/core'
import { fireEvent, render, screen } from '@testing-library/react'
import config from '../../../config/tamagui.config'

// Import mock data
import {
  MOBILE_DEVICES,
  TOUCH_TARGET_SPECS,
  generateTouchTargetTestData,
  generateViewportTestData,
} from '../../../test-utils/mock-data'

// Import components to test
import { BottomNavigation } from '../BottomNavigation'
import { CameraHeader } from '../CameraHeader'

// Mock Tamagui provider for tests
const TestProvider = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

/**
 * Mobile Viewport Tests - LEGACY FILE
 *
 * ⚠️  MIGRATION NOTICE ⚠️
 *
 * All tests from this file have been migrated to focused test files for better organization:
 *
 * ✅ camera-header.test.tsx - CameraHeader Component tests
 * ✅ bottom-navigation.test.tsx - BottomNavigation Component tests
 *
 * This file is kept for reference but should not contain active tests.
 * New tests should be added to the appropriate focused test file.
 */

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'

describe('Mobile Viewport - LEGACY', () => {
  it('serves as migration reference', () => {
    // This file has been migrated to focused test files
    // See the migration notice at the top of this file
    expect(true).toBe(true)
  })

  it('provides test file organization guidance', () => {
    // Use focused test files for better organization:
    // - Component-specific tests in component-name.test.tsx

    const guidance = ['camera-header.test.tsx', 'bottom-navigation.test.tsx']

    expect(guidance).toContain('camera-header.test.tsx')
  })
})
