// Export Supabase client and types
export { supabase } from './supabase'
export type { Database, Enums, Tables } from './supabase'

// Export validation utilities
export * from './validation'

// Export error handling utilities
export * from './supabase-errors'

// Export auth utilities
export * from './auth/authClient'
export * from './auth/authErrorMapping'

// Export RLS utilities
export * from './utils/rlsHelpers'

// Export query hooks (explicit to avoid conflicts)
export * from './hooks/useUser'
export * from './hooks/useQueryWithErrorHandling'
export * from './hooks/useMutationWithErrorHandling'
// Export specific types and functions from hooks to avoid conflicts
export {
  useCreateVideoRecording,
  useUploadProgress,
  useVideoRecordings,
  useVideoUpload,
  videoUploadKeys,
} from './hooks/useVideoUpload'
export {
  analysisKeys,
  useAnalysisJob,
  useAnalysisJobPolling,
} from './hooks/useAnalysis'

// Export services (explicit to avoid conflicts)
// Video upload service
export { uploadVideo } from './services/videoUploadService'
export type {
  UploadProgress,
  UploadSession,
  VideoRecordingInsert,
  VideoRecordingUpdate,
} from './services/videoUploadService'
// Analysis service
export type {
  AnalysisJob,
  AnalysisJobInsert,
  AnalysisJobUpdate,
  AnalysisResults as AnalysisServiceResults,
  AnalysisStatus as AnalysisServiceStatus,
  PoseData,
} from './services/analysisService'
export {
  createAnalysisJobWithPoseProcessing,
  updateAnalysisJobWithPoseData,
  startGeminiVideoAnalysis,
  computeVideoTimingParams,
  subscribeToAnalysisJob,
  getAnalysisJobByVideoId,
  // Mock exports for testing (defined in __mocks__ directory)
  __mockCreateAnalysisJob,
  __mockUpdateAnalysisJob,
  __mockComputeVideoTimingParams,
} from './services/analysisService'

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
