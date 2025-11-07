import { act, renderHook } from '@testing-library/react'
import { usePersistentProgressStore } from './persistentProgress'

describe('usePersistentProgressStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      usePersistentProgressStore.getState().reset()
    })
  })

  describe('Initialization', () => {
    it('should initialize with null props', () => {
      // Arrange & Act
      const { result } = renderHook(() => usePersistentProgressStore())

      // Assert
      expect(result.current.props).toBeNull()
    })
  })

  describe('setProps', () => {
    it('should update props when called with valid data', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore())
      const mockProps = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout: jest.fn(),
        onFallbackPress: jest.fn(),
      }

      // Act
      act(() => {
        result.current.setProps(mockProps)
      })

      // Assert
      expect(result.current.props).toEqual(mockProps)
    })

    it('should set props to null when called with null', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore())
      const mockProps = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout: jest.fn(),
        onFallbackPress: jest.fn(),
      }

      act(() => {
        result.current.setProps(mockProps)
      })

      // Act - clear props
      act(() => {
        result.current.setProps(null)
      })

      // Assert
      expect(result.current.props).toBeNull()
    })

    it('should maintain reference stability when primitives unchanged', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore())
      const onLayout = jest.fn()
      const onFallbackPress = jest.fn()
      const mockProps1 = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout,
        onFallbackPress,
      }

      act(() => {
        result.current.setProps(mockProps1)
      })
      const firstRef = result.current.props

      // Act - update with same primitives but new gesture objects (simulates Reanimated recreation)
      const mockProps2 = {
        currentTime: 5.5, // Same
        duration: 10.0, // Same
        isScrubbing: false, // Same
        controlsVisible: true, // Same
        progressBarWidth: 400, // Same
        animatedStyle: { opacity: 1 }, // New object
        combinedGesture: { gestureId: 99 }, // New gesture ID (Reanimated recreated)
        mainGesture: { gestureId: 100 }, // New gesture ID
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout,
        onFallbackPress,
      }

      act(() => {
        result.current.setProps(mockProps2)
      })

      // Assert - reference should be STABLE (same object) because primitives unchanged
      expect(result.current.props).toBe(firstRef)
    })

    it('should create new reference when primitives change', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore())
      const onLayout = jest.fn()
      const onFallbackPress = jest.fn()
      const mockProps1 = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout,
        onFallbackPress,
      }

      act(() => {
        result.current.setProps(mockProps1)
      })
      const firstRef = result.current.props

      // Act - update with DIFFERENT primitives
      const mockProps2 = {
        ...mockProps1,
        currentTime: 6.0, // CHANGED
      }

      act(() => {
        result.current.setProps(mockProps2)
      })

      // Assert - reference should be NEW because primitive changed
      expect(result.current.props).not.toBe(firstRef)
      expect(result.current.props?.currentTime).toBe(6.0)
    })
  })

  describe('reset', () => {
    it('should reset props to null', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore())
      const mockProps = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout: jest.fn(),
        onFallbackPress: jest.fn(),
      }

      act(() => {
        result.current.setProps(mockProps)
      })

      // Act
      act(() => {
        result.current.reset()
      })

      // Assert
      expect(result.current.props).toBeNull()
    })
  })

  describe('Selector patterns', () => {
    it('should allow selecting only props via selector', () => {
      // Arrange
      const { result } = renderHook(() => usePersistentProgressStore((state) => state.props))

      // Act
      const mockProps = {
        currentTime: 5.5,
        duration: 10.0,
        isScrubbing: false,
        controlsVisible: true,
        progressBarWidth: 400,
        animatedStyle: { opacity: 1 },
        combinedGesture: { gestureId: 1 },
        mainGesture: { gestureId: 2 },
        shouldRenderPersistent: true,
        animationName: 'quick' as const,
        onLayout: jest.fn(),
        onFallbackPress: jest.fn(),
      }

      act(() => {
        usePersistentProgressStore.getState().setProps(mockProps)
      })

      // Assert
      expect(result.current).toEqual(mockProps)
    })
  })
})
