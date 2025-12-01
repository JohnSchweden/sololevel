/**
 * Tests for videoValidation utilities
 *
 * Tests user-visible behavior: valid files pass, invalid files fail with clear errors
 * Following testing philosophy: focus on user behavior, not implementation
 */

// Unmock the module to test actual implementation
jest.unmock('@ui/utils/videoValidation')

import { formatDuration, formatFileSize, validateVideoFile } from './videoValidation'

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('videoValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateVideoFile', () => {
    it('should validate a valid video file', async () => {
      // 🧪 ARRANGE: Create valid video file with metadata override
      const validFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
      Object.defineProperty(validFile, 'size', { value: 5 * 1024 * 1024 }) // 5MB

      const metadataOverride = {
        duration: 15, // 15 seconds (under 30s limit)
        width: 1920,
        height: 1080,
      }

      // 🎬 ACT: Validate file
      const result = await validateVideoFile(validFile, {}, metadataOverride)

      // ✅ ASSERT: Should pass validation
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject video file that exceeds duration limit', async () => {
      // 🧪 ARRANGE: Create video file that's too long
      const longFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
      Object.defineProperty(longFile, 'size', { value: 10 * 1024 * 1024 }) // 10MB

      const metadataOverride = {
        duration: 45, // 45 seconds (over 30s limit)
        width: 1920,
        height: 1080,
      }

      // 🎬 ACT: Validate file
      const result = await validateVideoFile(longFile, {}, metadataOverride)

      // ✅ ASSERT: Should fail with user-visible error
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('Video too long'))
    })

    it('should reject empty file', async () => {
      // 🧪 ARRANGE: Create empty file
      const emptyFile = new File([], 'empty.mp4', { type: 'video/mp4' })
      Object.defineProperty(emptyFile, 'size', { value: 0 })

      // 🎬 ACT: Validate file (with metadata override to avoid video element creation)
      const result = await validateVideoFile(
        emptyFile,
        {},
        { duration: 0, size: 0, format: 'video/mp4' }
      )

      // ✅ ASSERT: Should fail with clear error
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual('File is empty')
    })
  })

  describe('formatFileSize', () => {
    it('should format file size in human-readable format', () => {
      // 🧪 ARRANGE: Various file sizes
      // 🎬 ACT & ✅ ASSERT: Format sizes
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(500)).toBe('500.0 B')
    })
  })

  describe('formatDuration', () => {
    it('should format duration in MM:SS format', () => {
      // 🧪 ARRANGE: Various durations
      // 🎬 ACT & ✅ ASSERT: Format durations
      expect(formatDuration(65)).toBe('01:05') // 1 minute 5 seconds
      expect(formatDuration(125)).toBe('02:05') // 2 minutes 5 seconds
      expect(formatDuration(5)).toBe('00:05') // 5 seconds
    })
  })
})
