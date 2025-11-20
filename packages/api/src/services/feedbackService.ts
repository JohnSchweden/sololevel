/**
 * Feedback Service
 * Handles user feedback submission to the database with proper authentication and validation
 */

import type { FeedbackSubmission } from '@my/app/features/GiveFeedback/types'
import { log } from '@my/logging'
import type { Database } from '../types/database'
import { createUserScopedInsert, requireAuthentication } from '../utils/rlsHelpers'

/**
 * User feedback record from the database
 */
export type UserFeedback = Database['public']['Tables']['user_feedback']['Row']

/**
 * User feedback insert type (public API - excludes user_id which is set by RLS)
 */
export type UserFeedbackInsert = Pick<
  Database['public']['Tables']['user_feedback']['Insert'],
  'type' | 'message'
>

/**
 * Submit user feedback to the database
 * @param feedback - The feedback submission containing type and message
 * @returns The inserted feedback record
 * @throws Error if authentication fails, validation fails, or database insert fails
 */
export async function submitUserFeedback(feedback: FeedbackSubmission): Promise<UserFeedback> {
  // Validate message length
  if (!feedback.message || feedback.message.trim().length === 0) {
    log.error('Feedback Service', 'Invalid feedback message length', {
      messageLength: feedback.message?.length || 0,
    })
    throw new Error('Message cannot be empty')
  }

  if (feedback.message.length > 1000) {
    log.error('Feedback Service', 'Invalid feedback message length', {
      messageLength: feedback.message.length,
    })
    throw new Error('Message must be 1000 characters or less')
  }

  // Get authenticated user
  const user = await requireAuthentication()

  try {
    // Insert feedback using RLS helper
    const { data, error } = await createUserScopedInsert(
      'user_feedback',
      {
        type: feedback.type,
        message: feedback.message.trim(),
      },
      user.id
    )

    if (error) {
      log.error('Feedback Service', 'Failed to submit feedback', {
        error,
        userId: user.id,
        feedbackType: feedback.type,
      })
      throw new Error(`Failed to submit feedback: ${error.message}`)
    }

    if (!data) {
      log.error('Feedback Service', 'No data returned from feedback insert', {
        userId: user.id,
        feedbackType: feedback.type,
      })
      throw new Error('Failed to submit feedback: No data returned')
    }

    log.info('Feedback Service', 'Feedback submitted successfully', {
      feedbackId: data.id,
      userId: user.id,
      feedbackType: feedback.type,
    })

    return data
  } catch (error) {
    // Re-throw authentication errors
    if (error instanceof Error && error.message.includes('not authenticated')) {
      throw error
    }

    // Log and re-throw other errors
    log.error('Feedback Service', 'Unexpected error submitting feedback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user.id,
      feedbackType: feedback.type,
    })
    throw error
  }
}
