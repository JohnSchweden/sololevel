/**
 * Tests for useTabPersistence hook
 *
 * Tests user-visible behavior: tab persistence across app sessions
 * Following TDD and testing philosophy: focus on user behavior, not implementation
 *
 * Note: Tests run in sequence due to module-level cache (by design).
 * First test loads cache, subsequent tests use cached value.
 */

import { mmkvDirect } from '@my/config'
import { act, renderHook } from '@testing-library/react'

// Import after mocks are defined
// eslint-disable-next-line import/order
import { useTabPersistence } from './useTabPersistence'

// Get mocked functions from the setup mock
const mockGetString = mmkvDirect.getString as jest.Mock
const mockSetString = mmkvDirect.setString as jest.Mock

// Mock logging to avoid console noise in tests
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})

describe('useTabPersistence', () => {
  // First test: loads from storage and populates module-level cache
  it('should load saved tab from storage on first mount', () => {
    // 🧪 ARRANGE: Mock returns saved tab
    mockGetString.mockReturnValueOnce('coach')

    // 🎬 ACT: Render hook (first time - loads from storage)
    const { result } = renderHook(() => useTabPersistence())

    // ✅ ASSERT: Should load saved tab synchronously (no loading state)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.activeTab).toBe('coach')
    expect(mockGetString).toHaveBeenCalledWith('activeTab')
  })

  // Second test: uses cached value, tests save functionality
  it('should save tab when user changes it', () => {
    // 🧪 ARRANGE: Hook already has cached value from first test
    const { result } = renderHook(() => useTabPersistence())

    // Initial state uses cache (no storage read)
    expect(result.current.isLoading).toBe(false)
    expect(mockGetString).not.toHaveBeenCalled() // Cache prevents read

    // 🎬 ACT: User changes tab
    act(() => {
      result.current.setActiveTab('insights')
    })

    // ✅ ASSERT: Tab should update and save to storage synchronously
    expect(result.current.activeTab).toBe('insights')
    expect(mockSetString).toHaveBeenCalledWith('activeTab', 'insights')
  })

  // Third test: validates input without storage operations
  it('should reject invalid tab values', () => {
    // 🧪 ARRANGE: Hook uses cached value
    const { result } = renderHook(() => useTabPersistence())

    expect(result.current.isLoading).toBe(false)
    const initialTab = result.current.activeTab

    // 🎬 ACT: Try to set invalid tab
    act(() => {
      // @ts-expect-error - Testing invalid input
      result.current.setActiveTab('invalid-tab')
    })

    // ✅ ASSERT: Tab should not change
    expect(result.current.activeTab).toBe(initialTab)
    expect(mockSetString).not.toHaveBeenCalled()
  })
})
