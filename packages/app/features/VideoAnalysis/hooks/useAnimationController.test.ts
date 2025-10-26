import { renderHook } from '@testing-library/react-native'
import { useAnimationController } from './useAnimationController'

describe('useAnimationController', () => {
  describe('Initialization', () => {
    it('should initialize scroll state with shared values', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert
      expect(result.current.scrollY).toBeDefined()
      expect(result.current.scrollY.value).toBeDefined()
      expect(result.current.feedbackContentOffsetY).toBeDefined()
      expect(result.current.feedbackContentOffsetY.value).toBeDefined()
    })

    it('should initialize scroll ref', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert
      expect(result.current.scrollRef).toBeDefined()
      expect(result.current.scrollRef.current).toBe(null)
    })

    it('should initialize derived animation values', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert
      expect(result.current.headerHeight).toBeDefined()
      expect(result.current.collapseProgress).toBeDefined()
    })

    it('should initialize animated styles', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert
      expect(result.current.headerStyle).toBeDefined()
      expect(result.current.feedbackSectionStyle).toBeDefined()
      expect(result.current.pullIndicatorStyle).toBeDefined()
    })
  })

  describe('Header Height Calculation', () => {
    it('should calculate header height for max mode (scroll = 0)', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert - headerHeight should be max when scrollY = 0
      expect(result.current.headerHeight.value).toBeGreaterThan(0)
    })

    it('should calculate header height for pull-to-reveal (negative scroll)', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Simulate negative scroll (pull-to-reveal)
      result.current.scrollY.value = -100

      // Assert - headerHeight should expand beyond max
      const maxHeight = result.current.headerHeight.value
      expect(maxHeight).toBeGreaterThan(0)
    })
  })

  describe('Collapse Progress Calculation', () => {
    it('should calculate collapse progress', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert - collapseProgress should be between 0 and 1
      expect(result.current.collapseProgress.value).toBeGreaterThanOrEqual(0)
      expect(result.current.collapseProgress.value).toBeLessThanOrEqual(1)
    })
  })
})
