import { useToastController } from '@my/ui'
import { type UseQueryOptions, type UseQueryResult, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

type QueryWithErrorHandlingOptions<TData, TError> = UseQueryOptions<TData, TError> & {
  showErrorToast?: boolean
  errorMessage?: string
}

export function useQueryWithErrorHandling<TData = unknown, TError = Error>(
  options: QueryWithErrorHandlingOptions<TData, TError>
): UseQueryResult<TData, TError> {
  // Safety check for SSR - don't use toast during server rendering
  let toast: any = null
  try {
    toast = useToastController()
  } catch (_error) {
    // Toast not available during SSR, that's okay
  }
  const lastErrorRef = useRef<TError | null>(null)

  const { showErrorToast = true, errorMessage, ...queryOptions } = options

  // Don't run queries during SSR
  const isClient = typeof window !== 'undefined'

  // Safety check for SSR - return a mock result if not on client
  if (!isClient) {
    return {
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isFetching: false,
      isRefetching: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isPlaceholderData: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      isPreviousData: false,
      isStale: false,
      refetch: () => Promise.resolve(),
      remove: () => {},
      status: 'idle',
    } as unknown as UseQueryResult<TData, TError>
  }

  // Wrap useQuery in try-catch to handle SSR gracefully
  let result: UseQueryResult<TData, TError>
  try {
    result = useQuery({
      ...queryOptions,
      throwOnError: false, // Always prevent throwing errors
      enabled: queryOptions.enabled !== false && isClient, // Only run on client
    })
  } catch (_error) {
    return {
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
      isFetching: false,
      isRefetching: false,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isPlaceholderData: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: false,
      isFetchedAfterMount: false,
      isPaused: false,
      isPreviousData: false,
      isStale: false,
      refetch: () => Promise.resolve(),
      remove: () => {},
      status: 'idle',
    } as unknown as UseQueryResult<TData, TError>
  }

  // Handle errors using useEffect to prevent setState during render
  useEffect(() => {
    if (result.isError && result.error && showErrorToast && result.error !== lastErrorRef.current) {
      lastErrorRef.current = result.error

      // Show user-friendly toast notification (only if toast is available)
      if (toast) {
        toast.show(errorMessage || 'Something went wrong', {
          message: 'Please try again in a moment',
        })
      }
    }

    // Reset error ref when query succeeds
    if (result.isSuccess && lastErrorRef.current) {
      lastErrorRef.current = null
    }
  }, [
    result.isError,
    result.error,
    result.isSuccess,
    showErrorToast,
    errorMessage,
    toast,
    options.queryKey,
  ])

  return result
}

// Convenience hook for common patterns
export function useQueryWithRetry<TData = unknown, TError = Error>(
  options: QueryWithErrorHandlingOptions<TData, TError> & {
    retryCount?: number
  }
) {
  const { retryCount = 3, ...queryOptions } = options

  return useQueryWithErrorHandling({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('4')) {
        return false
      }

      return failureCount < retryCount
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
