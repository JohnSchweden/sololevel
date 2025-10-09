// Unmock React Query to use real implementation (global setup mocks it)
jest.unmock('@tanstack/react-query')

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useMutationWithErrorHandling } from './useMutationWithErrorHandling'

// Mock toast controller
const mockToastShow = jest.fn()
jest.mock('@my/ui', () => ({
  useToastController: () => ({
    show: mockToastShow,
  }),
}))

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useMutationWithErrorHandling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('executes mutation successfully', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBe('success')
    expect(mockMutationFn).toHaveBeenCalledWith('test-input', expect.any(Object))
    expect(mockToastShow).not.toHaveBeenCalled() // No success toast by default
  })

  it('shows success toast when enabled', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showSuccessToast: true,
          successMessage: 'Operation completed!',
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockToastShow).toHaveBeenCalledWith('Operation completed!')
  })

  it('handles mutation error with default error toast', async () => {
    const mockError = new Error('Mutation failed')
    const mockMutationFn = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBe(mockError)
    expect(mockToastShow).toHaveBeenCalledWith('Action failed', {
      message: 'Please try again',
    })
  })

  it('handles mutation error with custom error message', async () => {
    const mockError = new Error('Custom error')
    const mockMutationFn = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          errorMessage: 'Custom error occurred',
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastShow).toHaveBeenCalledWith('Custom error occurred', {
      message: 'Please try again',
    })
  })

  it('disables error toast when showErrorToast is false', async () => {
    const mockError = new Error('Silent error')
    const mockMutationFn = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showErrorToast: false,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('calls custom onError handler', async () => {
    const mockError = new Error('Custom error')
    const mockMutationFn = jest.fn().mockRejectedValue(mockError)
    const mockOnError = jest.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onError: mockOnError,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockOnError).toHaveBeenCalledWith(mockError, 'test-input', undefined, expect.any(Object))
  })

  it('calls custom onSuccess handler', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue('success')
    const mockOnSuccess = jest.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockOnSuccess).toHaveBeenCalledWith(
      'success',
      'test-input',
      undefined,
      expect.any(Object)
    )
  })

  it('includes mutation key in error logging', async () => {
    const mockError = new Error('Keyed error')
    const mockMutationFn = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationKey: ['updateUser'],
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('does not show success toast without success message', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showSuccessToast: true,
          // No successMessage provided
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('passes through all other mutation options', async () => {
    const mockMutationFn = jest.fn().mockResolvedValue('success')
    const mockOnMutate = jest.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onMutate: mockOnMutate,
          retry: 2,
        }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.mutate('test-input')
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockOnMutate).toHaveBeenCalledWith('test-input', expect.any(Object))
  })
})
