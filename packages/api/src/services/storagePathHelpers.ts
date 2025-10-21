/**
 * Storage Path Helpers - Generate consistent storage paths with date partitioning
 *
 * Path formats:
 * - Videos: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
 * - Audio: {user_id}/videos/{yyyymmdd}/{video_recording_id}/audio/{feedback_id}/{segment_index}.{format}
 *
 * All paths use UTC date from database created_at timestamps for consistent organization.
 */

/**
 * Extract date folder from ISO timestamp
 * @param isoTimestamp ISO 8601 timestamp (e.g., "2025-10-14T12:30:45.123Z")
 * @returns Date folder in yyyymmdd format (e.g., "20251014")
 * @example
 * getDateFolder('2025-10-14T12:30:45.123Z') // Returns: '20251014'
 */
export function getDateFolder(isoTimestamp: string): string {
  // Extract YYYY-MM-DD from ISO string and remove hyphens
  return isoTimestamp.slice(0, 10).replace(/-/g, '')
}

/**
 * Build storage path for video recording
 * @param userId User UUID
 * @param videoRecordingId Video recording primary key
 * @param createdAt ISO timestamp from video_recordings.created_at
 * @param format File format (mp4, mov)
 * @returns Storage path: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
 * @example
 * buildVideoPath('488a7161...', 1234, '2025-10-14T12:30:00Z', 'mp4')
 * // Returns: '488a7161.../videos/20251014/1234/video.mp4'
 */
export function buildVideoPath(
  userId: string,
  videoRecordingId: number,
  createdAt: string,
  format: string
): string {
  const dateFolder = getDateFolder(createdAt)
  return `${userId}/videos/${dateFolder}/${videoRecordingId}/video.${format}`
}

/**
 * Build storage path for audio segment
 * @param userId User UUID
 * @param videoRecordingId Video recording primary key
 * @param feedbackId Feedback primary key
 * @param segmentIndex Segment index (0, 1, 2, ...)
 * @param videoCreatedAt ISO timestamp from video_recordings.created_at
 * @param format File format (mp3, wav)
 * @returns Storage path: {user_id}/videos/{yyyymmdd}/{video_id}/audio/{feedback_id}/{segment_index}.{format}
 * @example
 * buildAudioPath('488a7161...', 1234, 1069, 0, '2025-10-14T12:30:00Z', 'wav')
 * // Returns: '488a7161.../videos/20251014/1234/audio/1069/0.wav'
 */
export function buildAudioPath(
  userId: string,
  videoRecordingId: number,
  feedbackId: number,
  segmentIndex: number,
  videoCreatedAt: string,
  format: string
): string {
  const dateFolder = getDateFolder(videoCreatedAt)
  return `${userId}/videos/${dateFolder}/${videoRecordingId}/audio/${feedbackId}/${segmentIndex}.${format}`
}
