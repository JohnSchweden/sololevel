// Export Supabase client and types
export { supabase, resetSupabaseClient } from './supabase'
export type { Database, Enums, Tables, TablesInsert, TablesUpdate } from './supabase'

// Export validation utilities
export * from './validation'

// Export error handling utilities
export * from './supabase-errors'

// Export auth utilities
export * from './auth/authClient'
export * from './auth/authErrorMapping'

// Export RLS utilities
export * from './utils/rlsHelpers'

// Export services (explicit to avoid conflicts)
// Video upload service
export {
  uploadVideo,
  createSignedUploadUrl,
  createVideoRecording,
  updateVideoRecording,
  deleteVideoRecording,
  getUserVideoRecordings,
  getUploadProgress,
  cancelUpload,
  getVideoPublicUrl,
} from './services/videoUploadService'
// Storage service
export { createSignedDownloadUrl } from './services/storageService'
export type { SignedUrlResult } from './services/storageService'
// Storage path helpers
export { getDateFolder, buildVideoPath, buildAudioPath } from './services/storagePathHelpers'
// Video thumbnail service
export { generateVideoThumbnail, uploadVideoThumbnail } from './services/videoThumbnailService'
export type {
  UploadProgress,
  UploadSession,
  VideoRecordingInsert,
  VideoRecordingUpdate,
  VideoUploadOptions,
} from './services/videoUploadService'
// Analysis service
export type {
  AnalysisJob,
  AnalysisJobInsert,
  AnalysisJobUpdate,
  AnalysisJobWithVideo,
  AnalysisResults,
  AnalysisResults as AnalysisServiceResults,
  AnalysisStatus,
  AnalysisStatus as AnalysisServiceStatus,
  PoseData,
} from './services/analysisService'
export {
  // Core analysis job CRUD
  createAnalysisJob,
  getAnalysisJob,
  getAnalysisJobByVideoId,
  getUserAnalysisJobs,
  updateAnalysisJob,
  deleteAnalysisJob,
  // Analysis job lifecycle
  startAnalysisProcessing,
  updateAnalysisProgress,
  completeAnalysisJob,
  failAnalysisJob,
  // Analysis data extraction
  getAnalysisResults,
  getPoseData,
  getAnalysisStats,
  // Advanced analysis features
  createAnalysisJobWithPoseProcessing,
  updateAnalysisJobWithPoseData,
  startGeminiVideoAnalysis,
  computeVideoTimingParams,
  // Realtime subscriptions
  subscribeToAnalysisJob,
  subscribeToAnalysisTitle,
  subscribeToUserAnalysisJobs,
  subscribeToLatestAnalysisJobByRecordingId,
  // Query helpers
  getLatestAnalysisJobForRecordingId,
  getAnalysisIdForJobId,
  // Rating functions
  rateFeedbackItem,
  rateAnalysisFeedback,
  // Mock exports for testing (defined in __mocks__ directory)
  __mockCreateAnalysisJob,
  __mockUpdateAnalysisJob,
  __mockComputeVideoTimingParams,
} from './services/analysisService'
export { getFirstAudioUrlForFeedback } from './services/audioService'
// Feedback service
export {
  submitUserFeedback,
  type UserFeedback,
  type UserFeedbackInsert,
} from './services/feedbackService'
// Voice config service
export {
  getVoiceConfig,
  type CoachGender,
  type CoachMode,
  type CoachVoiceConfig,
} from './services/voiceConfigService'
// Voice preferences service
export {
  hasUserSetVoicePreferences,
  getUserVoicePreferences,
  updateVoicePreferences,
  updateAnalysisJobVoiceSnapshot,
  type VoicePreferences,
  type VoicePreferencesResult,
  type VoicePreferencesUpdate,
  type AnalysisJobVoiceSnapshot,
} from './services/voicePreferencesService'

// AI Analysis Edge service types
export type {
  VideoTimingParams,
  AIAnalysisRequest,
  AIAnalysisResponse,
} from './services/analysisService'
// Realtime service functions
export {
  createRealtimeConnection,
  handleConnectionResilience,
  reconnectWithBackoff,
  synchronizeOfflineData,
  resolveDataConflicts,
  manageSubscriptionScaling,
  subscribeToAnalysisUpdates,
  getConnectionStatus,
} from './services/realtimeService'
// Optimistic updates service functions - exported individually from hooks
// Offline service functions - exported individually from hooks

// Export validation schemas (explicit to avoid conflicts)
export {
  type AnalysisJob as ValidationAnalysisJob,
  type AnalysisJobInsert as ValidationAnalysisJobInsert,
  AnalysisJobInsertSchema,
  AnalysisJobSchema,
  type AnalysisJobUpdate as ValidationAnalysisJobUpdate,
  AnalysisJobUpdateSchema,
  type AnalysisResults as ValidationAnalysisResults,
  AnalysisResultsSchema,
  type AnalysisStatus as ValidationAnalysisStatus,
  type PoseData as ValidationPoseData,
  PoseDataSchema,
  type UploadProgress as ValidationUploadProgress,
  UploadProgressSchema,
  type UploadStatus,
  validatePoseData,
  type VideoRecording,
  VideoRecordingInsertSchema,
  VideoRecordingSchema,
  VideoRecordingUpdateSchema,
} from './validation/cameraRecordingSchemas'

// Export AI prompts and prompt management
export * from './prompts'
