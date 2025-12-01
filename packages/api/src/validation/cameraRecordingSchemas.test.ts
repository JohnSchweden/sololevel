/**
 * Tests for cameraRecordingSchemas
 *
 * Tests critical schema validation: valid data passes, invalid data fails with clear errors
 * Following testing philosophy: focus on user-visible behavior
 */

import { describe, expect, it } from 'vitest'
import {
  safeValidateFeedbackList,
  validateFeedbackItem,
  validateFeedbackList,
  validateGeminiAnalysisResult,
  validateVideoRecording,
} from './cameraRecordingSchemas'

describe('cameraRecordingSchemas', () => {
  describe('validateVideoRecording', () => {
    it('should validate valid video recording data', () => {
      // 🧪 ARRANGE: Valid video recording
      const validRecording = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        filename: 'test.mp4',
        original_filename: 'test.mp4',
        file_size: 1024000,
        duration_seconds: 15,
        format: 'mp4' as const,
        storage_path: '/videos/test.mp4',
        upload_status: 'completed' as const,
        upload_progress: 100,
        metadata: null,
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      }

      // 🎬 ACT: Validate
      const result = validateVideoRecording(validRecording)

      // ✅ ASSERT: Should pass validation
      expect(result).toEqual(validRecording)
    })

    it('should reject video recording with duration exceeding limit', () => {
      // 🧪 ARRANGE: Video recording with duration over limit (30s)
      const invalidRecording = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        filename: 'test.mp4',
        original_filename: 'test.mp4',
        file_size: 1024000,
        duration_seconds: 45, // Over 30s limit
        format: 'mp4' as const,
        storage_path: '/videos/test.mp4',
        upload_status: 'completed' as const,
        upload_progress: 100,
        metadata: null,
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      }

      // 🎬 ACT & ✅ ASSERT: Should throw validation error
      expect(() => validateVideoRecording(invalidRecording)).toThrow()
    })
  })

  describe('validateFeedbackItem', () => {
    it('should validate valid feedback item', () => {
      // 🧪 ARRANGE: Valid feedback item
      const validFeedback = {
        timestamp: 5.5,
        category: 'Movement' as const,
        message: 'Keep your shoulders relaxed',
        confidence: 0.85,
        impact: 0.7,
      }

      // 🎬 ACT: Validate
      const result = validateFeedbackItem(validFeedback)

      // ✅ ASSERT: Should pass validation
      expect(result).toEqual(validFeedback)
    })

    it('should reject feedback item with invalid confidence', () => {
      // 🧪 ARRANGE: Feedback item with confidence below minimum (0.7)
      const invalidFeedback = {
        timestamp: 5.5,
        category: 'Movement' as const,
        message: 'Keep your shoulders relaxed',
        confidence: 0.5, // Below 0.7 minimum
        impact: 0.7,
      }

      // 🎬 ACT & ✅ ASSERT: Should throw validation error
      expect(() => validateFeedbackItem(invalidFeedback)).toThrow()
    })
  })

  describe('validateFeedbackList', () => {
    it('should validate valid feedback list', () => {
      // 🧪 ARRANGE: Valid feedback list
      const validList = {
        feedback: [
          {
            timestamp: 5.5,
            category: 'Movement' as const,
            message: 'Keep your shoulders relaxed',
            confidence: 0.85,
            impact: 0.7,
          },
        ],
      }

      // 🎬 ACT: Validate
      const result = validateFeedbackList(validList)

      // ✅ ASSERT: Should pass validation
      expect(result).toEqual(validList)
    })

    it('should reject empty feedback list', () => {
      // 🧪 ARRANGE: Empty feedback list
      const invalidList = {
        feedback: [],
      }

      // 🎬 ACT & ✅ ASSERT: Should throw validation error (min 1 item)
      expect(() => validateFeedbackList(invalidList)).toThrow()
    })
  })

  describe('validateGeminiAnalysisResult', () => {
    it('should validate valid analysis result', () => {
      // 🧪 ARRANGE: Valid analysis result
      const validResult = {
        textReport: 'Overall good performance',
        feedback: [
          {
            timestamp: 5.5,
            category: 'Movement' as const,
            message: 'Keep your shoulders relaxed',
            confidence: 0.85,
            impact: 0.7,
          },
        ],
        metrics: {
          posture: 85,
          movement: 80,
          overall: 82,
        },
        confidence: 0.9,
      }

      // 🎬 ACT: Validate
      const result = validateGeminiAnalysisResult(validResult)

      // ✅ ASSERT: Should pass validation
      expect(result).toEqual(validResult)
    })
  })

  describe('safeValidateFeedbackList', () => {
    it('should return null for invalid data instead of throwing', () => {
      // 🧪 ARRANGE: Invalid feedback list
      const invalidList = {
        feedback: [],
      }

      // 🎬 ACT: Safe validate
      const result = safeValidateFeedbackList(invalidList)

      // ✅ ASSERT: Should return null instead of throwing
      expect(result).toBeNull()
    })

    it('should return validated data for valid input', () => {
      // 🧪 ARRANGE: Valid feedback list
      const validList = {
        feedback: [
          {
            timestamp: 5.5,
            category: 'Movement' as const,
            message: 'Keep your shoulders relaxed',
            confidence: 0.85,
            impact: 0.7,
          },
        ],
      }

      // 🎬 ACT: Safe validate
      const result = safeValidateFeedbackList(validList)

      // ✅ ASSERT: Should return validated data
      expect(result).toEqual(validList)
    })
  })
})
