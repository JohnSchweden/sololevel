/**
 * Hook for submitting user feedback
 * Uses TanStack Query mutation with error handling and toast notifications
 */

import { useMutationWithErrorHandling } from '@app/hooks/useMutationWithErrorHandling'
import { submitUserFeedback } from '@my/api'
import type { FeedbackSubmission } from '../types'

/**
 * Hook for submitting user feedback to the database
 * @returns Mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const { mutate, isPending, isError } = useSubmitFeedback()
 *
 * const handleSubmit = () => {
 *   mutate({ type: 'suggestion', message: 'Great app!' }, {
 *     onSuccess: () => {
 *       // Handle success
 *     }
 *   })
 * }
 * ```
 */
export function useSubmitFeedback() {
  return useMutationWithErrorHandling({
    mutationFn: async (feedback: FeedbackSubmission) => {
      return await submitUserFeedback(feedback)
    },
    showErrorToast: true,
    showSuccessToast: true,
    errorMessage: 'Failed to submit feedback',
    successMessage: 'Feedback submitted successfully',
  })
}
