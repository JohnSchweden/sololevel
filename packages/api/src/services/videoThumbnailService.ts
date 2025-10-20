/**
 * Platform-agnostic video thumbnail service
 * Exports the appropriate implementation based on platform
 */

// Platform-specific thumbnail generation (Metro resolves .native or .web)
export { generateVideoThumbnail } from './videoThumbnailService.native'

// Shared upload logic (works on all platforms)
export { uploadVideoThumbnail } from './videoThumbnailUpload'
