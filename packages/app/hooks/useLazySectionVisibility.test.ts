import { act, renderHook } from '@testing-library/react'
import { useLazySectionVisibility } from './useLazySectionVisibility'

// Mock timers for testing
jest.useFakeTimers()

describe('useLazySectionVisibility', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe('Initial State', () => {
    it('should initialize with first section visible when renderFirstImmediately is true', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 4,
          renderFirstImmediately: true,
        })
      )

      // Assert
      expect(result.current.visibleSections).toEqual([true, false, false, false])
    })

    it('should initialize with all sections hidden when renderFirstImmediately is false', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 3,
          renderFirstImmediately: false,
        })
      )

      // Assert
      expect(result.current.visibleSections).toEqual([false, false, false])
    })

    it('should handle empty section count', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 0,
        })
      )

      // Assert
      expect(result.current.visibleSections).toEqual([])
    })
  })

  describe('Sequential Rendering', () => {
    it('should render sections sequentially with delay when renderFirstImmediately is true', () => {
      // Arrange
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 4,
          renderFirstImmediately: true,
          renderDelay: 100,
        })
      )

      // Assert - Initially first section visible
      expect(result.current.visibleSections).toEqual([true, false, false, false])

      // Act - Advance time by 50ms (section 1 should not be visible yet)
      act(() => {
        jest.advanceTimersByTime(50)
      })
      expect(result.current.visibleSections).toEqual([true, false, false, false])

      // Act - Advance time by another 50ms (section 1 should be visible at 100ms)
      act(() => {
        jest.advanceTimersByTime(50)
      })
      expect(result.current.visibleSections).toEqual([true, true, false, false])

      // Act - Advance time by 100ms (section 2 should be visible at 200ms)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, true, true, false])

      // Act - Advance time by 100ms (section 3 should be visible at 300ms)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, true, true, true])
    })

    it('should render sections sequentially with delay when renderFirstImmediately is false', () => {
      // Arrange
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 3,
          renderFirstImmediately: false,
          renderDelay: 100,
        })
      )

      // Assert - Initially all hidden
      expect(result.current.visibleSections).toEqual([false, false, false])

      // Act - Advance time by 100ms (section 0 should be visible)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, false, false])

      // Act - Advance time by 100ms (section 1 should be visible)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, true, false])

      // Act - Advance time by 100ms (section 2 should be visible)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, true, true])
    })
  })

  describe('Default Values', () => {
    it('should use default renderFirstImmediately=true', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 2,
        })
      )

      // Assert
      expect(result.current.visibleSections).toEqual([true, false])
    })

    it('should use default renderDelay=100', () => {
      // Arrange
      const { result } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 3,
          renderFirstImmediately: true,
        })
      )

      // Assert - Initially first section visible
      expect(result.current.visibleSections).toEqual([true, false, false])

      // Act - Advance time by 50ms (section 1 should not be visible yet)
      act(() => {
        jest.advanceTimersByTime(50)
      })
      expect(result.current.visibleSections).toEqual([true, false, false])

      // Act - Advance time by another 50ms (section 1 should be visible at 100ms)
      act(() => {
        jest.advanceTimersByTime(50)
      })
      expect(result.current.visibleSections).toEqual([true, true, false])

      // Act - Advance time by 100ms (section 2 should be visible at 200ms)
      act(() => {
        jest.advanceTimersByTime(100)
      })
      expect(result.current.visibleSections).toEqual([true, true, true])
    })
  })

  describe('Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() =>
        useLazySectionVisibility({
          sectionCount: 3,
          renderFirstImmediately: true,
          renderDelay: 100,
        })
      )

      // Act - Unmount before timers fire
      unmount()

      // Assert - No errors should occur (timers cleaned up)
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000)
        })
      }).not.toThrow()
    })
  })
})
