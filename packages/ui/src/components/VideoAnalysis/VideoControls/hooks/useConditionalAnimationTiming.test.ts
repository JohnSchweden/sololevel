import { renderHook } from '@testing-library/react'
import { useConditionalAnimationTiming } from './useConditionalAnimationTiming'

describe('useConditionalAnimationTiming', () => {
  describe('getAnimationDuration', () => {
    it('should return quick duration (200ms) for user tap interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const duration = result.current.getAnimationDuration('user-tap')

      // Assert
      expect(duration).toBe(200)
    })

    it('should return lazy duration (400ms) for auto-hide interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const duration = result.current.getAnimationDuration('auto-hide')

      // Assert
      expect(duration).toBe(400)
    })

    it('should return quick duration (200ms) for playback-end interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const duration = result.current.getAnimationDuration('playback-end')

      // Assert
      expect(duration).toBe(200)
    })
  })

  describe('getAnimationName', () => {
    it('should return "quick" for user tap interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const animationName = result.current.getAnimationName('user-tap')

      // Assert
      expect(animationName).toBe('quick')
    })

    it('should return "lazy" for auto-hide interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const animationName = result.current.getAnimationName('auto-hide')

      // Assert
      expect(animationName).toBe('lazy')
    })

    it('should return "quick" for playback-end interaction', () => {
      // Arrange
      const { result } = renderHook(() => useConditionalAnimationTiming())

      // Act
      const animationName = result.current.getAnimationName('playback-end')

      // Assert
      expect(animationName).toBe('quick')
    })
  })
})
