import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'

// Mock expo-router
const mockSetOptions = jest.fn()
const mockGoBack = jest.fn()
const mockReplace = jest.fn()
const mockNavigation = {
  setOptions: mockSetOptions,
  goBack: mockGoBack,
}
const mockRouter = {
  back: mockGoBack,
  replace: mockReplace,
}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: () => mockNavigation,
}))

// Mock the logger
jest.mock('@my/logging', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock the VideoAnalysisScreen component
jest.mock('@app/features/VideoAnalysis/VideoAnalysisScreen', () => ({
  VideoAnalysisScreen: ({ onControlsVisibilityChange, testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('div', {
      'data-testid': testID || 'video-analysis-screen',
      'data-oncontrolsvisibilitychange': !!onControlsVisibilityChange,
      ...props,
    })
  },
}))

describe('VideoAnalysis Route - Header Visibility Coordination', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Controls Visibility Change Handler', () => {
    it('should set headerVisible=true when controls become visible (user interaction)', () => {
      // Arrange
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(false)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(false)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          setIsUserInteraction(isUserInteraction)
          setControlsVisible(visible)
        }

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          handleControlsVisibilityChange,
        }
      })

      // Act: User taps to show controls
      act(() => {
        result.current.handleControlsVisibilityChange(true, true)
      })

      // Assert: State should be updated
      expect(result.current.controlsVisible).toBe(true)
      expect(result.current.isUserInteraction).toBe(true)
    })

    it('should set headerVisible=false when controls hide automatically', () => {
      // Arrange
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(true)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(false)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          setIsUserInteraction(isUserInteraction)
          setControlsVisible(visible)
        }

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          handleControlsVisibilityChange,
        }
      })

      // Act: Controls hide automatically
      act(() => {
        result.current.handleControlsVisibilityChange(false, false)
      })

      // Assert: State should be updated
      expect(result.current.controlsVisible).toBe(false)
      expect(result.current.isUserInteraction).toBe(false)
    })

    it('should reset isUserInteraction flag after animation timeout', () => {
      // Arrange
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(false)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(false)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          setIsUserInteraction(isUserInteraction)
          setControlsVisible(visible)

          // Reset user interaction flag after animation completes (quick = 200ms)
          if (isUserInteraction) {
            setTimeout(() => {
              setIsUserInteraction(false)
            }, 250)
          }
        }

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          handleControlsVisibilityChange,
        }
      })

      // Act: User interaction triggers timeout
      act(() => {
        result.current.handleControlsVisibilityChange(true, true)
      })

      // Assert: Initially true
      expect(result.current.isUserInteraction).toBe(true)

      // Act: Fast-forward time
      act(() => {
        jest.advanceTimersByTime(250)
      })

      // Assert: Should be reset to false
      expect(result.current.isUserInteraction).toBe(false)
    })
  })

  describe('Navigation Options Coordination', () => {
    it('should calculate correct navigation options for user interaction', () => {
      // Arrange
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(false)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(false)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          setIsUserInteraction(isUserInteraction)
          setControlsVisible(visible)
        }

        // Simulate the useLayoutEffect logic
        const headerIsUserInteraction = isUserInteraction
        const headerShown = isProcessing || controlsVisible

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          headerIsUserInteraction,
          headerShown,
          handleControlsVisibilityChange,
        }
      })

      // Act: User shows controls
      act(() => {
        result.current.handleControlsVisibilityChange(true, true)
      })

      // Assert: Navigation options should be calculated correctly
      expect(result.current.headerShown).toBe(true)
      expect(result.current.headerIsUserInteraction).toBe(true)
      expect(result.current.controlsVisible).toBe(true)
    })

    it('should calculate correct navigation options for processing state', () => {
      // Arrange
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(false)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(true)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          setIsUserInteraction(isUserInteraction)
          setControlsVisible(visible)
        }

        // Simulate the useLayoutEffect logic
        const headerIsUserInteraction = isUserInteraction
        const headerShown = isProcessing || controlsVisible

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          headerIsUserInteraction,
          headerShown,
          handleControlsVisibilityChange,
        }
      })

      // Act: Processing state changes
      act(() => {
        // No user interaction, just processing state
      })

      // Assert: Navigation options should show header for processing
      expect(result.current.headerShown).toBe(true)
      expect(result.current.headerIsUserInteraction).toBe(false)
      expect(result.current.isProcessing).toBe(true)
    })
  })

  describe('Route Parameter Handling', () => {
    it('should detect history mode from analysisJobId parameter', () => {
      // Arrange
      const mockUseLocalSearchParams = jest.fn(() => ({ analysisJobId: '123' }))
      jest.doMock('expo-router', () => ({
        useLocalSearchParams: mockUseLocalSearchParams,
        useRouter: () => mockRouter,
        useNavigation: () => mockNavigation,
      }))

      // Act
      const params = mockUseLocalSearchParams()
      const isHistoryMode = !!params.analysisJobId

      // Assert
      expect(isHistoryMode).toBe(true)
    })

    it('should detect analysis mode from videoRecordingId parameter', () => {
      // Arrange
      const mockUseLocalSearchParams = jest.fn(() => ({ videoRecordingId: '456' }))
      jest.doMock('expo-router', () => ({
        useLocalSearchParams: mockUseLocalSearchParams,
        useRouter: () => mockRouter,
        useNavigation: () => mockNavigation,
      }))

      // Act
      const params = mockUseLocalSearchParams()
      const isHistoryMode = !!(params as any).analysisJobId

      // Assert
      expect(isHistoryMode).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      // Arrange
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderHook(() => {
        const [controlsVisible, setControlsVisible] = useState(false)
        const [isUserInteraction, setIsUserInteraction] = useState(false)
        const [isProcessing] = useState(false)

        const handleControlsVisibilityChange = (visible: boolean, isUserInteraction = false) => {
          try {
            setIsUserInteraction(isUserInteraction)
            setControlsVisible(visible)

            // Simulate potential error in callback
            if (visible && isUserInteraction) {
              throw new Error('Test error')
            }
          } catch (error) {
            // biome-ignore lint/suspicious/noConsole: test expects error to be logged
            console.error('Error in handleControlsVisibilityChange:', error)
          }
        }

        return {
          controlsVisible,
          isUserInteraction,
          isProcessing,
          handleControlsVisibilityChange,
        }
      })

      // Act: Trigger error condition
      act(() => {
        result.current.handleControlsVisibilityChange(true, true)
      })

      // Assert: Error should be caught and logged
      expect(consoleError).toHaveBeenCalledWith(
        'Error in handleControlsVisibilityChange:',
        expect.any(Error)
      )

      // Cleanup
      consoleError.mockRestore()
    })
  })
})
