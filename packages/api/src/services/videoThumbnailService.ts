/**
 * Platform-agnostic video thumbnail service
 * Exports the appropriate implementation based on platform
 */

// Platform-specific implementations will be resolved by Metro bundler
export { generateVideoThumbnail } from './videoThumbnailService.native'
