// Export all VideoAnalysis-specific stores
// Note: Camera recording stores moved to packages/app/features/CameraRecording/stores/

// Upload Progress
export {
  useUploadProgressSelectors,
  useUploadProgressStore,
  useUploadTask,
} from './uploadProgress'
export type {
  UploadProgressStore,
  UploadQueue,
  UploadTask,
} from './uploadProgress'

// Analysis Status - REMOVED: Migrated to TanStack Query
// Use useAnalysisJob() and useAnalysisJobByVideoId() from @app/hooks/useAnalysis instead

// Analysis Subscription
export { useAnalysisSubscriptionStore } from './analysisSubscription'
export type {
  AnalysisJob,
  SubscriptionOptions,
  SubscriptionState,
  SubscriptionStatus,
} from './analysisSubscription'

// Feedback Status
export {
  useFeedbacksByAnalysisId,
  useFeedbackStatus,
  useFeedbackStatusSelectors,
  useFeedbackStatusStore,
} from './feedbackStatus'
export type {
  FeedbackProcessingStatus,
  FeedbackStatusData,
  FeedbackStatusState,
  FeedbackStatusStore,
} from './feedbackStatus'

// Video Analysis Store
export { useVideoAnalysisStore } from './videoAnalysisStore'
export type {
  AnalysisError,
  AnalysisResult,
  AnalysisStage,
  VideoAnalysisActions,
  VideoAnalysisState,
  VideoAnalysisStore,
} from './videoAnalysisStore'

// Persistent Progress Store
export { usePersistentProgressStore } from './persistentProgress'
export type {
  PersistentProgressActions,
  PersistentProgressState,
  PersistentProgressStore,
} from './persistentProgress'

// Video Player Playback Store
export { useVideoPlayerStore } from './videoAnalysisPlaybackStore'
export type { VideoPlayerStoreState } from './videoAnalysisPlaybackStore'
