import { act, renderHook } from '@testing-library/react'
import { AppState, Platform } from 'react-native'
import { useIsAppActive } from './useIsAppActive'

// Mock AppState - capture listener for testing
const mockRemoveListener = jest.fn()
let mockAppStateListener: ((state: string) => void) | null = null

// Mock AppState with listener capture
jest.mock('react-native', () => {
  const React = require('react')
  return {
    Platform: {
      OS: 'web', // Default, will be overridden in tests
      select: jest.fn((obj: any) => obj.web || obj.default),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn((event: string, callback: (state: string) => void) => {
        if (event === 'change') {
          mockAppStateListener = callback
        }
        return { remove: mockRemoveListener }
      }),
    },
    // Keep other mocks from setup.ts
    StyleSheet: {
      flatten: jest.fn((style: any) => style || {}),
      create: jest.fn((styles: any) => styles),
      absoluteFill: {},
      absoluteFillObject: {},
      hairlineWidth: 1,
    },
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { testID, ...props }, children),
    Text: ({ children, testID, ...props }: any) =>
      React.createElement('span', { testID, ...props }, children),
  }
})

describe('useIsAppActive', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppStateListener = null
    // Reset Platform.OS to default
    ;(Platform as any).OS = 'web'
  })

  it('should return true initially on Android', () => {
    // Arrange
    ;(Platform as any).OS = 'android'

    // Act
    const { result } = renderHook(() => useIsAppActive())

    // Assert
    expect(result.current).toBe(true)
  })

  it('should always return true on iOS', () => {
    // Arrange
    ;(Platform as any).OS = 'ios'

    // Act
    const { result } = renderHook(() => useIsAppActive())

    // Assert
    expect(result.current).toBe(true)
    // Verify no listener is set up on iOS
    expect(AppState.addEventListener).not.toHaveBeenCalled()
  })

  it('should return false when app goes to background on Android', () => {
    // Arrange
    ;(Platform as any).OS = 'android'
    const { result } = renderHook(() => useIsAppActive())

    // Act - Simulate app going to background
    act(() => {
      if (mockAppStateListener) {
        mockAppStateListener('background')
      }
    })

    // Assert
    expect(result.current).toBe(false)
  })

  it('should return true when app returns to foreground on Android', () => {
    // Arrange
    ;(Platform as any).OS = 'android'
    const { result } = renderHook(() => useIsAppActive())

    // Act - Simulate app going to background first
    act(() => {
      if (mockAppStateListener) {
        mockAppStateListener('background')
      }
    })
    expect(result.current).toBe(false)

    // Act - Simulate app returning to foreground
    act(() => {
      if (mockAppStateListener) {
        mockAppStateListener('active')
      }
    })

    // Assert
    expect(result.current).toBe(true)
  })

  it('should clean up listener on unmount', () => {
    // Arrange
    ;(Platform as any).OS = 'android'
    const { unmount } = renderHook(() => useIsAppActive())

    // Act
    unmount()

    // Assert
    expect(mockRemoveListener).toHaveBeenCalledTimes(1)
  })
})
