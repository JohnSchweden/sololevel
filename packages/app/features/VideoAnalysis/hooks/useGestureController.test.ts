import { renderHook } from '@testing-library/react-native'
import { useGestureController } from './useGestureController'

// Mock Gesture.Pan to return a chainable mock
const mockPanGesture = {
  withRef: jest.fn().mockReturnThis(),
  minDistance: jest.fn().mockReturnThis(),
  activeOffsetY: jest.fn().mockReturnThis(),
  activeOffsetX: jest.fn().mockReturnThis(),
  failOffsetX: jest.fn().mockReturnThis(),
  failOffsetY: jest.fn().mockReturnThis(),
  onTouchesDown: jest.fn().mockReturnThis(),
  onBegin: jest.fn().mockReturnThis(),
  onStart: jest.fn().mockReturnThis(),
  onChange: jest.fn().mockReturnThis(),
  onEnd: jest.fn().mockReturnThis(),
  onFinalize: jest.fn().mockReturnThis(),
}

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => mockPanGesture),
  },
}))

describe('useGestureController', () => {
  // Arrange: Setup shared values and refs for all tests
  const createTestDependencies = () => {
    const scrollY = { value: 0 }
    const feedbackContentOffsetY = { value: 0 }
    const scrollRef = { current: null }
    return { scrollY, feedbackContentOffsetY, scrollRef }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with gesture configuration', () => {
      // Arrange
      const { scrollY, feedbackContentOffsetY, scrollRef } = createTestDependencies()

      // Act
      const { result } = renderHook(() =>
        useGestureController(scrollY as any, feedbackContentOffsetY as any, scrollRef as any)
      )

      // Assert
      expect(result.current.rootPan).toBeDefined()
      expect(result.current.rootPanRef).toBeDefined()
      const feedbackScrollSnapshot = result.current.feedbackScroll.getSnapshot()
      expect(feedbackScrollSnapshot.enabled).toBe(true)
      expect(feedbackScrollSnapshot.blockCompletely).toBe(false)
      expect(result.current.pullToReveal.getSnapshot()).toBe(false)
    })

    it('should configure pan gesture with correct parameters', () => {
      // Arrange
      const { scrollY, feedbackContentOffsetY, scrollRef } = createTestDependencies()

      // Act
      renderHook(() =>
        useGestureController(scrollY as any, feedbackContentOffsetY as any, scrollRef as any)
      )

      // Assert
      expect(mockPanGesture.minDistance).toHaveBeenCalledWith(5)
      expect(mockPanGesture.activeOffsetY).toHaveBeenCalledWith([-20, 20])
      // Hook uses failOffsetX for back navigation area protection (not activeOffsetX)
      expect(mockPanGesture.failOffsetX).toHaveBeenCalledWith([Number.NEGATIVE_INFINITY, 10])
    })
  })

  describe('Scroll State Management', () => {
    it('should provide callback to update feedback scroll position', () => {
      // Arrange
      const { scrollY, feedbackContentOffsetY, scrollRef } = createTestDependencies()

      // Act
      const { result } = renderHook(() =>
        useGestureController(scrollY as any, feedbackContentOffsetY as any, scrollRef as any)
      )

      // Assert
      expect(result.current.onFeedbackScrollY).toBeDefined()
      expect(typeof result.current.onFeedbackScrollY).toBe('function')
    })

    it('should provide callback for momentum scroll end', () => {
      // Arrange
      const { scrollY, feedbackContentOffsetY, scrollRef } = createTestDependencies()

      // Act
      const { result } = renderHook(() =>
        useGestureController(scrollY as any, feedbackContentOffsetY as any, scrollRef as any)
      )

      // Assert
      expect(result.current.onFeedbackMomentumScrollEnd).toBeDefined()
      expect(typeof result.current.onFeedbackMomentumScrollEnd).toBe('function')
    })
  })

  describe('Gesture Lifecycle', () => {
    it('should register all gesture lifecycle handlers', () => {
      // Arrange
      const { scrollY, feedbackContentOffsetY, scrollRef } = createTestDependencies()

      // Act
      renderHook(() =>
        useGestureController(scrollY as any, feedbackContentOffsetY as any, scrollRef as any)
      )

      // Assert
      expect(mockPanGesture.onTouchesDown).toHaveBeenCalled()
      expect(mockPanGesture.onBegin).toHaveBeenCalled()
      expect(mockPanGesture.onStart).toHaveBeenCalled()
      expect(mockPanGesture.onChange).toHaveBeenCalled()
      expect(mockPanGesture.onEnd).toHaveBeenCalled()
      expect(mockPanGesture.onFinalize).toHaveBeenCalled()
    })
  })
})
