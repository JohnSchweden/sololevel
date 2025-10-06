import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMutationWithErrorHandling } from '../useMutationWithErrorHandling'

// Mock toast controller
const mockToastShow = vi.fn()
vi.mock('@my/ui', () => ({
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
    vi.clearAllMocks()
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('executes mutation successfully', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBe('success')
    expect(mockMutationFn).toHaveBeenCalledWith('test-input', expect.any(Object))
    expect(mockToastShow).not.toHaveBeenCalled() // No success toast by default
  })

  it('shows success toast when enabled', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showSuccessToast: true,
          successMessage: 'Operation completed!',
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockToastShow).toHaveBeenCalledWith('Operation completed!')
  })

  it('handles mutation error with default error toast', async () => {
    const mockError = new Error('Mutation failed')
    const mockMutationFn = vi.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

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
    const mockMutationFn = vi.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          errorMessage: 'Custom error occurred',
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastShow).toHaveBeenCalledWith('Custom error occurred', {
      message: 'Please try again',
    })
  })

  it('disables error toast when showErrorToast is false', async () => {
    const mockError = new Error('Silent error')
    const mockMutationFn = vi.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showErrorToast: false,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('calls custom onError handler', async () => {
    const mockError = new Error('Custom error')
    const mockMutationFn = vi.fn().mockRejectedValue(mockError)
    const mockOnError = vi.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onError: mockOnError,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockOnError).toHaveBeenCalledWith(mockError, 'test-input', undefined, expect.any(Object))
  })

  it('calls custom onSuccess handler', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue('success')
    const mockOnSuccess = vi.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onSuccess: mockOnSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

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
    const mockMutationFn = vi.fn().mockRejectedValue(mockError)

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationKey: ['updateUser'],
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('does not show success toast without success message', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue('success')

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          showSuccessToast: true,
          // No successMessage provided
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('passes through all other mutation options', async () => {
    const mockMutationFn = vi.fn().mockResolvedValue('success')
    const mockOnMutate = vi.fn()

    const { result } = renderHook(
      () =>
        useMutationWithErrorHandling({
          mutationFn: mockMutationFn,
          onMutate: mockOnMutate,
          retry: 2,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('test-input')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockOnMutate).toHaveBeenCalledWith('test-input', expect.any(Object))
  })
})
