import { describe, expect, it } from 'vitest'
import { buildAudioPath, buildVideoPath, getDateFolder } from './storagePathHelpers'

describe('storagePathHelpers', () => {
  describe('getDateFolder', () => {
    it('should extract date in yyyymmdd format from ISO timestamp', () => {
      // Arrange
      const isoTimestamp = '2025-10-14T12:30:45.123Z'

      // Act
      const result = getDateFolder(isoTimestamp)

      // Assert
      expect(result).toBe('20251014')
    })

    it('should handle different months and days correctly', () => {
      // Arrange & Act & Assert
      expect(getDateFolder('2025-01-01T00:00:00.000Z')).toBe('20250101')
      expect(getDateFolder('2025-12-31T23:59:59.999Z')).toBe('20251231')
      expect(getDateFolder('2024-02-29T12:00:00.000Z')).toBe('20240229') // Leap year
    })

    it('should handle UTC timezone consistently', () => {
      // Arrange
      const timestamp1 = '2025-10-14T23:59:59.000Z' // Late night UTC
      const timestamp2 = '2025-10-15T00:00:00.000Z' // Next day UTC

      // Act & Assert
      expect(getDateFolder(timestamp1)).toBe('20251014')
      expect(getDateFolder(timestamp2)).toBe('20251015')
    })
  })

  describe('buildVideoPath', () => {
    it('should build correct video storage path with date partition', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const createdAt = '2025-10-14T12:30:00.000Z'
      const format = 'mp4'

      // Act
      const result = buildVideoPath(userId, videoRecordingId, createdAt, format)

      // Assert
      expect(result).toBe('488a7161-5d6e-4c4b-9a8e-12345678abcd/videos/20251014/1234/video.mp4')
    })

    it('should support different video formats', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const createdAt = '2025-10-14T12:30:00.000Z'

      // Act & Assert
      expect(buildVideoPath(userId, videoRecordingId, createdAt, 'mp4')).toContain('video.mp4')
      expect(buildVideoPath(userId, videoRecordingId, createdAt, 'mov')).toContain('video.mov')
    })

    it('should handle different video recording IDs', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const createdAt = '2025-10-14T12:30:00.000Z'
      const format = 'mp4'

      // Act & Assert
      expect(buildVideoPath(userId, 1, createdAt, format)).toContain('/1/video.mp4')
      expect(buildVideoPath(userId, 9999, createdAt, format)).toContain('/9999/video.mp4')
    })

    it('should use UTC date for path regardless of timestamp time', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const format = 'mp4'

      // Act & Assert
      expect(
        buildVideoPath(userId, videoRecordingId, '2025-10-14T00:00:00.000Z', format)
      ).toContain('/20251014/')
      expect(
        buildVideoPath(userId, videoRecordingId, '2025-10-14T23:59:59.999Z', format)
      ).toContain('/20251014/')
    })
  })

  describe('buildAudioPath', () => {
    it('should build correct audio storage path with date partition', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const feedbackId = 1069
      const segmentIndex = 0
      const videoCreatedAt = '2025-10-14T12:30:00.000Z'
      const format = 'wav'

      // Act
      const result = buildAudioPath(
        userId,
        videoRecordingId,
        feedbackId,
        segmentIndex,
        videoCreatedAt,
        format
      )

      // Assert
      expect(result).toBe(
        '488a7161-5d6e-4c4b-9a8e-12345678abcd/videos/20251014/1234/audio/1069/0.wav'
      )
    })

    it('should support different audio formats', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const feedbackId = 1069
      const segmentIndex = 0
      const videoCreatedAt = '2025-10-14T12:30:00.000Z'

      // Act & Assert
      expect(
        buildAudioPath(userId, videoRecordingId, feedbackId, segmentIndex, videoCreatedAt, 'wav')
      ).toContain('0.wav')
      expect(
        buildAudioPath(userId, videoRecordingId, feedbackId, segmentIndex, videoCreatedAt, 'mp3')
      ).toContain('0.mp3')
    })

    it('should handle different segment indices', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const feedbackId = 1069
      const videoCreatedAt = '2025-10-14T12:30:00.000Z'
      const format = 'wav'

      // Act & Assert
      expect(
        buildAudioPath(userId, videoRecordingId, feedbackId, 0, videoCreatedAt, format)
      ).toContain('/0.wav')
      expect(
        buildAudioPath(userId, videoRecordingId, feedbackId, 1, videoCreatedAt, format)
      ).toContain('/1.wav')
      expect(
        buildAudioPath(userId, videoRecordingId, feedbackId, 5, videoCreatedAt, format)
      ).toContain('/5.wav')
    })

    it('should group audio under same video date folder', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const feedbackId = 1069
      const segmentIndex = 0
      const videoCreatedAt = '2025-10-14T12:30:00.000Z' // Video created Oct 14
      const format = 'wav'

      // Act
      const result = buildAudioPath(
        userId,
        videoRecordingId,
        feedbackId,
        segmentIndex,
        videoCreatedAt,
        format
      )

      // Assert
      // Audio should use video's creation date (Oct 14), not audio generation date
      expect(result).toContain('/videos/20251014/')
      expect(result).toContain('/1234/audio/') // Under video ID folder
    })

    it('should handle different feedback IDs under same video', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const segmentIndex = 0
      const videoCreatedAt = '2025-10-14T12:30:00.000Z'
      const format = 'wav'

      // Act & Assert
      expect(
        buildAudioPath(userId, videoRecordingId, 1069, segmentIndex, videoCreatedAt, format)
      ).toContain('/audio/1069/0.wav')
      expect(
        buildAudioPath(userId, videoRecordingId, 1070, segmentIndex, videoCreatedAt, format)
      ).toContain('/audio/1070/0.wav')
    })

    it('should match video path structure (date and video ID)', () => {
      // Arrange
      const userId = '488a7161-5d6e-4c4b-9a8e-12345678abcd'
      const videoRecordingId = 1234
      const createdAt = '2025-10-14T12:30:00.000Z'

      // Act
      const videoPath = buildVideoPath(userId, videoRecordingId, createdAt, 'mp4')
      const audioPath = buildAudioPath(userId, videoRecordingId, 1069, 0, createdAt, 'wav')

      // Assert
      // Both paths should share the same prefix: {userId}/videos/{date}/{videoId}
      expect(audioPath).toContain('488a7161-5d6e-4c4b-9a8e-12345678abcd/videos/20251014/1234/')
      expect(videoPath).toContain('488a7161-5d6e-4c4b-9a8e-12345678abcd/videos/20251014/1234/')
    })
  })
})
