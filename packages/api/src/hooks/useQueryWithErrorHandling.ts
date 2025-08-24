import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import { useToastController } from '@my/ui'
import { useEffect, useRef } from 'react'

type QueryWithErrorHandlingOptions<TData, TError> = UseQueryOptions<TData, TError> & {
  showErrorToast?: boolean
  errorMessage?: string
}

export function useQueryWithErrorHandling<TData = unknown, TError = Error>(
  options: QueryWithErrorHandlingOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const toast = useToastController()
  const lastErrorRef = useRef<TError | null>(null)

  const { showErrorToast = true, errorMessage, ...queryOptions } = options

  const result = useQuery({
    ...queryOptions,
    throwOnError: false, // Always prevent throwing errors
  })

  // Handle errors using useEffect to prevent setState during render
  useEffect(() => {
    if (result.isError && result.error && showErrorToast && result.error !== lastErrorRef.current) {
      lastErrorRef.current = result.error

      // Log error for debugging
      console.error('Query failed:', {
        queryKey: options.queryKey,
        error: result.error,
        timestamp: new Date().toISOString(),
      })

      // Show user-friendly toast notification
      toast.show(errorMessage || 'Something went wrong', {
        message: 'Please try again in a moment',
      })
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
