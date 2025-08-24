import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import { useToastController } from '@my/ui'

type MutationWithErrorHandlingOptions<TData, TError, TVariables, TContext> = UseMutationOptions<
  TData,
  TError,
  TVariables,
  TContext
> & {
  showErrorToast?: boolean
  showSuccessToast?: boolean
  errorMessage?: string
  successMessage?: string
}

export function useMutationWithErrorHandling<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: MutationWithErrorHandlingOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const toast = useToastController()

  const {
    showErrorToast = true,
    showSuccessToast = false,
    errorMessage,
    successMessage,
    onError,
    onSuccess,
    ...mutationOptions
  } = options

  return useMutation({
    ...mutationOptions,
    onError: (error, variables, context) => {
      // Log error for debugging
      console.error('Mutation failed:', {
        mutationKey: options.mutationKey,
        error,
        variables,
        timestamp: new Date().toISOString(),
      })

      // Show user-friendly toast notification
      if (showErrorToast) {
        toast.show(errorMessage || 'Action failed', {
          message: 'Please try again',
        })
      }

      // Call custom error handler if provided
      onError?.(error, variables, context)
    },
    onSuccess: (data, variables, context) => {
      // Show success toast if requested
      if (showSuccessToast && successMessage) {
        toast.show(successMessage)
      }

      // Call custom success handler if provided
      onSuccess?.(data, variables, context)
    },
  })
}

// Note: Optimistic updates require QueryClient to be passed manually
// This is a simplified version without automatic cache management
