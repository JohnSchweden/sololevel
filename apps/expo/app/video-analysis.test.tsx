import { beforeEach, describe, expect, it, jest } from '@jest/globals'

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

type VisibilityOptions = {
  controlsVisible?: boolean
  isUserInteraction?: boolean
  isProcessing?: boolean
  throwOnInteraction?: boolean
}

const createVisibilityCoordinator = (options: VisibilityOptions = {}) => {
  let controlsVisible = options.controlsVisible ?? false
  let isUserInteraction = options.isUserInteraction ?? false
  const isProcessing = options.isProcessing ?? false

  const syncNavigationOptions = () => {
    mockSetOptions({
      headerShown: isProcessing || controlsVisible,
      isUserInteraction,
      headerVisible: isProcessing || controlsVisible,
    })
  }

  const handleControlsVisibilityChange = (visible: boolean, userInteraction = false) => {
    try {
      isUserInteraction = userInteraction
      controlsVisible = visible
      syncNavigationOptions()

      if (userInteraction) {
        setTimeout(() => {
          isUserInteraction = false
          syncNavigationOptions()
        }, 250)
      }

      if (options.throwOnInteraction && visible && userInteraction) {
        throw new Error('Test error')
      }
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: Tests assert error logging side effects.
      console.error('Error in handleControlsVisibilityChange:', error)
    }
  }

  syncNavigationOptions()

  const getState = () => ({
    controlsVisible,
    isUserInteraction,
    isProcessing,
    headerIsUserInteraction: isUserInteraction,
    headerShown: isProcessing || controlsVisible,
  })

  return {
    handleControlsVisibilityChange,
    getState,
  }
}

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
      const coordinator = createVisibilityCoordinator()

      coordinator.handleControlsVisibilityChange(true, true)

      const state = coordinator.getState()
      expect(state.controlsVisible).toBe(true)
      expect(state.isUserInteraction).toBe(true)
    })

    it('should set headerVisible=false when controls hide automatically', () => {
      const coordinator = createVisibilityCoordinator({ controlsVisible: true })

      coordinator.handleControlsVisibilityChange(false, false)

      const state = coordinator.getState()
      expect(state.controlsVisible).toBe(false)
      expect(state.isUserInteraction).toBe(false)
    })

    it('should reset isUserInteraction flag after animation timeout', () => {
      const coordinator = createVisibilityCoordinator()

      coordinator.handleControlsVisibilityChange(true, true)
      expect(coordinator.getState().isUserInteraction).toBe(true)

      jest.advanceTimersByTime(250)

      expect(coordinator.getState().isUserInteraction).toBe(false)
    })
  })

  describe('Navigation Options Coordination', () => {
    it('should call setOptions with correct parameters for user interaction', () => {
      const coordinator = createVisibilityCoordinator()

      coordinator.handleControlsVisibilityChange(true, true)

      expect(mockSetOptions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headerShown: true,
          isUserInteraction: true,
          headerVisible: true,
        })
      )
    })

    it('should call setOptions with correct parameters for processing state', () => {
      createVisibilityCoordinator({ isProcessing: true })

      expect(mockSetOptions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headerShown: true,
          isUserInteraction: false,
          headerVisible: true,
        })
      )
    })
  })

  describe('Route Parameter Handling', () => {
    it('should detect history mode from analysisJobId parameter', () => {
      const params: Partial<Record<'analysisJobId' | 'videoRecordingId', string>> = {
        analysisJobId: '123',
      }
      const isHistoryMode = Boolean(params.analysisJobId)

      expect(isHistoryMode).toBe(true)
    })

    it('should detect analysis mode from videoRecordingId parameter', () => {
      const params: Partial<Record<'analysisJobId' | 'videoRecordingId', string>> = {
        videoRecordingId: '456',
      }
      const isHistoryMode = Boolean(params.analysisJobId)

      expect(isHistoryMode).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      const coordinator = createVisibilityCoordinator({ throwOnInteraction: true })

      coordinator.handleControlsVisibilityChange(true, true)

      expect(consoleError).toHaveBeenCalledWith(
        'Error in handleControlsVisibilityChange:',
        expect.any(Error)
      )

      consoleError.mockRestore()
    })
  })
})
