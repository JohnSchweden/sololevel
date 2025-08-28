/**
 * Custom Hook Test Template
 * Copy this template and customize for your hook
 */

// Import shared test utilities (includes all mocks and setup)
import '../test-utils/setup'
import { useHookName } from '../hooks/useHookName'
import { act, renderHook, waitFor } from '../test-utils'

describe('useHookName', () => {
  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useHookName())

      expect(result.current).toEqual(
        expect.objectContaining({
          // Add your expected default values
          isLoading: false,
          data: null,
          error: null,
        })
      )
    })

    it('should accept initial configuration', () => {
      const config = {
        initialValue: 'test',
        enabled: true,
      }

      const { result } = renderHook(() => useHookName(config))

      expect(result.current).toEqual(
        expect.objectContaining({
          // Add your expected initialized values
          data: 'test',
          isEnabled: true,
        })
      )
    })
  })

  describe('State Management', () => {
    it('should update state correctly', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.updateValue('new value')
      })

      expect(result.current.data).toBe('new value')
    })

    it('should handle multiple state updates', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.setLoading(true)
        result.current.setData({ id: 1, name: 'test' })
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toEqual({ id: 1, name: 'test' })
    })

    it('should reset to initial state', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.updateValue('modified')
      })

      expect(result.current.data).toBe('modified')

      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBe(null) // or your initial value
    })
  })

  describe('Async Operations', () => {
    it('should handle successful async operations', async () => {
      // Mock successful API response
      const mockApiResponse = { success: true, data: 'test data' }

      // Setup your mock here
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.performAsyncOperation()
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockApiResponse)
      expect(result.current.error).toBe(null)
    })

    it('should handle failed async operations', async () => {
      // Mock failed API response
      const mockError = new Error('API Error')

      // Setup your mock here
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.performAsyncOperation()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toEqual(mockError)
      expect(result.current.data).toBe(null)
    })

    it('should cancel ongoing operations', async () => {
      const { result, unmount } = renderHook(() => useHookName())

      act(() => {
        result.current.performAsyncOperation()
      })

      expect(result.current.isLoading).toBe(true)

      // Unmount component to trigger cleanup
      unmount()

      // The operation should be cancelled
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Side Effects', () => {
    it('should handle component unmounting', () => {
      const { result, unmount } = renderHook(() => useHookName())

      act(() => {
        result.current.startSideEffect()
      })

      expect(result.current.hasSideEffect).toBe(true)

      unmount()

      // Hook should clean up side effects
      expect(result.current.hasSideEffect).toBe(false)
    })

    it('should handle window events', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        // Simulate window resize
        window.dispatchEvent(new Event('resize'))
      })

      expect(result.current.windowWidth).toBeDefined()
    })

    it('should handle keyboard events', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        // Simulate key press
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(result.current.isEscapePressed).toBe(true)
    })
  })

  describe('Dependencies', () => {
    it('should re-run when dependencies change', () => {
      const { result, rerender } = renderHook(({ dependency }) => useHookName({ dependency }), {
        initialProps: { dependency: 'initial' },
      })

      expect(result.current.dependencyValue).toBe('initial')

      rerender({ dependency: 'updated' })

      expect(result.current.dependencyValue).toBe('updated')
    })

    it('should not re-run when dependencies are the same', () => {
      const mockEffect = jest.fn()
      const { result, rerender } = renderHook(
        ({ dependency }) => {
          useHookName({ dependency })
          mockEffect()
          return result
        },
        { initialProps: { dependency: 'same' } }
      )

      expect(mockEffect).toHaveBeenCalledTimes(1)

      rerender({ dependency: 'same' })

      // Effect should not run again
      expect(mockEffect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid parameters', () => {
      expect(() => {
        renderHook(() => useHookName({ invalidParam: 'invalid' }))
      }).toThrow('Invalid parameter')
    })

    it('should handle null/undefined inputs', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.processInput(null)
        result.current.processInput(undefined)
      })

      expect(result.current.error).toBe(null)
    })

    it('should recover from error states', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.causeError()
      })

      expect(result.current.error).not.toBe(null)

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Performance', () => {
    it('should memoize expensive calculations', () => {
      const expensiveCalculation = jest.fn(() => 'expensive result')
      const { result, rerender } = renderHook(() => useHookName())

      // First render
      expect(result.current.expensiveValue).toBe('expensive result')
      expect(expensiveCalculation).toHaveBeenCalledTimes(1)

      // Re-render with same props
      rerender()

      // Calculation should not run again
      expect(expensiveCalculation).toHaveBeenCalledTimes(1)
    })

    it('should debounce rapid updates', async () => {
      const mockUpdate = jest.fn()
      const { result } = renderHook(() => useHookName({ debounceMs: 100 }))

      // Rapid updates
      act(() => {
        result.current.updateValue('value1')
        result.current.updateValue('value2')
        result.current.updateValue('value3')
      })

      // Should not call update immediately
      expect(mockUpdate).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockUpdate).toHaveBeenCalledTimes(1)
        },
        { timeout: 200 }
      )

      // Should only call with latest value
      expect(mockUpdate).toHaveBeenCalledWith('value3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.setData([])
      })

      expect(result.current.data).toEqual([])
      expect(result.current.isEmpty).toBe(true)
    })

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({ id: i }))

      const { result } = renderHook(() => useHookName())

      act(() => {
        result.current.setData(largeData)
      })

      expect(result.current.data).toHaveLength(1000)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle concurrent operations', async () => {
      const { result } = renderHook(() => useHookName())

      // Start multiple operations
      const promise1 = result.current.performOperation('op1')
      const promise2 = result.current.performOperation('op2')

      await Promise.all([promise1, promise2])

      expect(result.current.completedOperations).toEqual(['op1', 'op2'])
    })
  })

  describe('Integration with Other Hooks', () => {
    it('should work with useState', () => {
      const { result } = renderHook(() => {
        const [externalState, setExternalState] = React.useState('external')
        const hookResult = useHookName()

        return { ...hookResult, externalState, setExternalState }
      })

      act(() => {
        result.current.setExternalState('updated')
      })

      expect(result.current.externalState).toBe('updated')
    })

    it('should work with useEffect', () => {
      const mockSideEffect = jest.fn()

      renderHook(() => {
        const hookResult = useHookName()
        React.useEffect(() => {
          if (hookResult.data) {
            mockSideEffect(hookResult.data)
          }
        }, [hookResult.data])

        return hookResult
      })

      act(() => {
        // Trigger data update
        // This should call the side effect
      })

      expect(mockSideEffect).toHaveBeenCalled()
    })
  })
})
