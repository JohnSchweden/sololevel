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

    it('should initialize collapse progress shared value', () => {
      // Act
      const { result } = renderHook(() => useAnimationController())

      // Assert
      expect(result.current.collapseProgress).toBeDefined()
      expect(result.current.collapseProgress.value).toBeDefined()
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
