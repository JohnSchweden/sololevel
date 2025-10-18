import { act, renderHook } from '@testing-library/react'
import { useStaggeredAnimation } from './useStaggeredAnimation'

// Mock timers for testing
jest.useFakeTimers()

describe('useStaggeredAnimation', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('should initialize with all items invisible', () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      useStaggeredAnimation({
        itemCount: 3,
        autoStart: false,
      })
    )

    // Assert
    expect(result.current.visibleItems).toEqual([false, false, false])
    expect(result.current.isAnimating).toBe(false)
  })

  it('should animate items with stagger delay', () => {
    // Arrange
    const { result } = renderHook(() =>
      useStaggeredAnimation({
        itemCount: 3,
        staggerDelay: 100,
        autoStart: false,
      })
    )

    // Act - Start animation
    act(() => {
      result.current.startAnimation()
    })

    // Assert - Initially all invisible
    expect(result.current.visibleItems).toEqual([false, false, false])
    expect(result.current.isAnimating).toBe(true)

    // Act - Advance time by 50ms (first item should be visible)
    act(() => {
      jest.advanceTimersByTime(50)
    })

    // Assert - First item visible
    expect(result.current.visibleItems).toEqual([true, false, false])

    // Act - Advance time by another 100ms (second item should be visible)
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Assert - First two items visible
    expect(result.current.visibleItems).toEqual([true, true, false])

    // Act - Advance time by another 100ms (third item should be visible)
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Assert - All items visible and animation complete
    expect(result.current.visibleItems).toEqual([true, true, true])
    expect(result.current.isAnimating).toBe(false)
  })

  it('should auto-start animation when dependencies change', () => {
    // Arrange
    let dependencies = [false, false]
    const { result, rerender } = renderHook(() =>
      useStaggeredAnimation({
        itemCount: 2,
        staggerDelay: 50,
        dependencies,
      })
    )

    // Assert - Initially all invisible
    expect(result.current.visibleItems).toEqual([false, false])

    // Act - Change dependencies
    dependencies = [true, false]
    rerender()

    // Assert - Animation should start
    expect(result.current.isAnimating).toBe(true)

    // Act - Advance time to complete animation
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Assert - All items visible
    expect(result.current.visibleItems).toEqual([true, true])
    expect(result.current.isAnimating).toBe(false)
  })

  it('should reset animation correctly', () => {
    // Arrange
    const { result } = renderHook(() =>
      useStaggeredAnimation({
        itemCount: 2,
        autoStart: false,
      })
    )

    // Act - Start and complete animation
    act(() => {
      result.current.startAnimation()
    })
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Assert - All items visible
    expect(result.current.visibleItems).toEqual([true, true])

    // Act - Reset animation
    act(() => {
      result.current.resetAnimation()
    })

    // Assert - All items invisible and not animating
    expect(result.current.visibleItems).toEqual([false, false])
    expect(result.current.isAnimating).toBe(false)
  })

  it('should use default stagger delay of 50ms', () => {
    // Arrange
    const { result } = renderHook(() =>
      useStaggeredAnimation({
        itemCount: 2,
        autoStart: false,
      })
    )

    // Act - Start animation
    act(() => {
      result.current.startAnimation()
    })

    // Assert - Initially invisible
    expect(result.current.visibleItems).toEqual([false, false])

    // Act - Advance by 25ms (first item should be visible at 0ms delay)
    act(() => {
      jest.advanceTimersByTime(25)
    })
    expect(result.current.visibleItems).toEqual([true, false])

    // Act - Advance by 50ms (second item should be visible)
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(result.current.visibleItems).toEqual([true, true])
  })
})
