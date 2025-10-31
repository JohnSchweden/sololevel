import { act, renderHook } from '@testing-library/react'
import { useAnimationBatching } from '../useAnimationBatching'

// Mock Date.now for consistent timing in tests
const mockDateNow = jest.fn(() => 1000000)
Date.now = mockDateNow

describe('useAnimationBatching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should batch multiple animations together', () => {
    const { result } = renderHook(() =>
      useAnimationBatching({
        type: 'quick',
        targetDuration: 200,
        componentName: 'TestBatch',
        debounceDelay: 50,
        maxBatchSize: 3,
      })
    )

    const onStart1 = jest.fn()
    const onEnd1 = jest.fn()
    const onStart2 = jest.fn()
    const onEnd2 = jest.fn()

    // Add first animation
    act(() => {
      result.current.addAnimation({
        id: 'animation-1',
        type: 'quick',
        targetDuration: 200,
        componentName: 'Test1',
        onStart: onStart1,
        onEnd: onEnd1,
      })
    })

    // Add second animation within debounce delay
    act(() => {
      result.current.addAnimation({
        id: 'animation-2',
        type: 'quick',
        targetDuration: 150,
        componentName: 'Test2',
        onStart: onStart2,
        onEnd: onEnd2,
      })
    })

    // Should not have started yet due to debounce
    expect(onStart1).not.toHaveBeenCalled()
    expect(onStart2).not.toHaveBeenCalled()

    // Fast-forward past debounce delay
    act(() => {
      jest.advanceTimersByTime(50)
    })

    // Both animations should start
    expect(onStart1).toHaveBeenCalled()
    expect(onStart2).toHaveBeenCalled()

    // Fast-forward past animation duration
    act(() => {
      jest.advanceTimersByTime(200) // Max duration
    })

    // Both animations should end
    expect(onEnd1).toHaveBeenCalled()
    expect(onEnd2).toHaveBeenCalled()
  })

  it('should flush batch when maxBatchSize is reached', () => {
    const { result } = renderHook(() =>
      useAnimationBatching({
        type: 'quick',
        targetDuration: 200,
        componentName: 'TestBatch',
        debounceDelay: 50,
        maxBatchSize: 2,
      })
    )

    const onStart1 = jest.fn()
    const onStart2 = jest.fn()
    const onStart3 = jest.fn()

    // Add first animation
    act(() => {
      result.current.addAnimation({
        id: 'animation-1',
        type: 'quick',
        targetDuration: 200,
        componentName: 'Test1',
        onStart: onStart1,
      })
    })

    // Should not have started yet (due to debounce delay)
    expect(onStart1).not.toHaveBeenCalled()

    // Add second animation - should trigger immediate flush (maxBatchSize = 2)
    act(() => {
      result.current.addAnimation({
        id: 'animation-2',
        type: 'quick',
        targetDuration: 150,
        componentName: 'Test2',
        onStart: onStart2,
      })
    })

    // Both animations should start immediately (because maxBatchSize was reached)
    expect(onStart1).toHaveBeenCalled()
    expect(onStart2).toHaveBeenCalled()

    // Wait for the first batch to complete
    act(() => {
      jest.advanceTimersByTime(200) // Max duration of first batch
    })

    // Add third animation - should start a new batch
    act(() => {
      result.current.addAnimation({
        id: 'animation-3',
        type: 'quick',
        targetDuration: 100,
        componentName: 'Test3',
        onStart: onStart3,
      })
    })

    // Third animation should not have started yet (new batch, waiting for debounce)
    expect(onStart3).not.toHaveBeenCalled()
  })

  it('should provide correct batch status', () => {
    const { result } = renderHook(() =>
      useAnimationBatching({
        type: 'quick',
        targetDuration: 200,
        componentName: 'TestBatch',
        debounceDelay: 50,
        maxBatchSize: 3,
      })
    )

    // Initially no pending animations
    expect(result.current.getBatchStatus()).toEqual({
      pendingCount: 0,
      isBatching: false,
      batchStartTime: null,
    })

    // Add animation
    act(() => {
      result.current.addAnimation({
        id: 'animation-1',
        type: 'quick',
        targetDuration: 200,
        componentName: 'Test1',
      })
    })

    // Should have pending animation
    expect(result.current.getBatchStatus().pendingCount).toBe(1)
    expect(result.current.getBatchStatus().isBatching).toBe(false)

    // Fast-forward past debounce delay
    act(() => {
      jest.advanceTimersByTime(50)
    })

    // Should be batching
    expect(result.current.getBatchStatus().isBatching).toBe(true)
    expect(result.current.getBatchStatus().batchStartTime).not.toBeNull()
  })

  it('should clear batch correctly', () => {
    const { result } = renderHook(() =>
      useAnimationBatching({
        type: 'quick',
        targetDuration: 200,
        componentName: 'TestBatch',
        debounceDelay: 50,
        maxBatchSize: 3,
      })
    )

    // Add animation
    act(() => {
      result.current.addAnimation({
        id: 'animation-1',
        type: 'quick',
        targetDuration: 200,
        componentName: 'Test1',
      })
    })

    expect(result.current.getBatchStatus().pendingCount).toBe(1)

    // Clear batch
    act(() => {
      result.current.clearBatch()
    })

    expect(result.current.getBatchStatus()).toEqual({
      pendingCount: 0,
      isBatching: false,
      batchStartTime: null,
    })
  })
})
