/**
 * Video compression utility with platform-specific implementations
 * Exports the appropriate implementation based on platform
 */

// Platform-specific implementations
export { compressVideo } from './videoCompression.native'

// Re-export types from native implementation
export type { CompressionOptions, CompressionResult } from './videoCompression.native'
