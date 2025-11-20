/**
 * TDD Tests for Feedback Service
 * Tests user feedback submission with proper authentication and validation
 */

import type { FeedbackSubmission } from '@my/app/features/GiveFeedback/types'
import { log } from '@my/logging'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createUserScopedInsert, requireAuthentication } from '../utils/rlsHelpers'
import { submitUserFeedback } from './feedbackService'

// Mock @my/logging
vi.mock('@my/logging', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock RLS helpers
vi.mock('../utils/rlsHelpers', () => ({
  requireAuthentication: vi.fn(),
  createUserScopedInsert: vi.fn(),
}))

const mockRequireAuthentication = requireAuthentication as ReturnType<typeof vi.fn>
const mockCreateUserScopedInsert = createUserScopedInsert as ReturnType<typeof vi.fn>

describe('feedbackService', () => {
  describe('submitUserFeedback', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should submit feedback successfully with valid input', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockFeedback: FeedbackSubmission = {
        type: 'suggestion',
        message: 'Great app!',
      }
      const mockInsertedFeedback = {
        id: 1,
        user_id: 'user-123',
        type: 'suggestion',
        message: 'Great app!',
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      }

      mockRequireAuthentication.mockResolvedValue(mockUser)
      mockCreateUserScopedInsert.mockResolvedValue({
        data: mockInsertedFeedback,
        error: null,
      })

      // Act
      const result = await submitUserFeedback(mockFeedback)

      // Assert
      expect(mockRequireAuthentication).toHaveBeenCalledTimes(1)
      expect(mockCreateUserScopedInsert).toHaveBeenCalledWith(
        'user_feedback',
        {
          type: 'suggestion',
          message: 'Great app!',
        },
        'user-123'
      )
      expect(result).toEqual(mockInsertedFeedback)
      expect(log.info).toHaveBeenCalledWith(
        'Feedback Service',
        'Feedback submitted successfully',
        expect.objectContaining({ feedbackId: 1, userId: 'user-123' })
      )
    })

    it('should reject feedback with message exceeding 1000 characters', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const longMessage = 'a'.repeat(1001)
      const mockFeedback: FeedbackSubmission = {
        type: 'bug',
        message: longMessage,
      }

      mockRequireAuthentication.mockResolvedValue(mockUser)

      // Act & Assert
      await expect(submitUserFeedback(mockFeedback)).rejects.toThrow(
        'Message must be 1000 characters or less'
      )
      expect(mockCreateUserScopedInsert).not.toHaveBeenCalled()
      expect(log.error).toHaveBeenCalledWith(
        'Feedback Service',
        'Invalid feedback message length',
        expect.objectContaining({ messageLength: 1001 })
      )
    })

    it('should reject feedback with empty message', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockFeedback: FeedbackSubmission = {
        type: 'suggestion',
        message: '',
      }

      mockRequireAuthentication.mockResolvedValue(mockUser)

      // Act & Assert
      await expect(submitUserFeedback(mockFeedback)).rejects.toThrow('Message cannot be empty')
      expect(mockCreateUserScopedInsert).not.toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      // Arrange
      const mockFeedback: FeedbackSubmission = {
        type: 'complaint',
        message: 'Not working',
      }

      mockRequireAuthentication.mockRejectedValue(new Error('User not authenticated'))

      // Act & Assert
      await expect(submitUserFeedback(mockFeedback)).rejects.toThrow('User not authenticated')
      expect(mockCreateUserScopedInsert).not.toHaveBeenCalled()
    })

    it('should handle database insert errors', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockFeedback: FeedbackSubmission = {
        type: 'other',
        message: 'Some feedback',
      }

      mockRequireAuthentication.mockResolvedValue(mockUser)
      mockCreateUserScopedInsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '23505' },
      })

      // Act & Assert
      await expect(submitUserFeedback(mockFeedback)).rejects.toThrow(
        'Failed to submit feedback: Database error'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Feedback Service',
        'Failed to submit feedback',
        expect.objectContaining({ error: expect.anything() })
      )
    })

    it('should accept all valid feedback types', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const types: Array<FeedbackSubmission['type']> = ['bug', 'suggestion', 'complaint', 'other']

      mockRequireAuthentication.mockResolvedValue(mockUser)
      mockCreateUserScopedInsert.mockResolvedValue({
        data: { id: 1, user_id: 'user-123', type: '', message: '', created_at: '', updated_at: '' },
        error: null,
      })

      // Act & Assert
      for (const type of types) {
        await submitUserFeedback({ type, message: 'Test message' })
        expect(mockCreateUserScopedInsert).toHaveBeenCalledWith(
          'user_feedback',
          expect.objectContaining({ type }),
          'user-123'
        )
      }
    })
  })
})
