// Camera Recording Validation Schemas
const MAX_DURATION_SECONDS = Number.parseInt(
  process.env.EXPO_PUBLIC_MAX_RECORDING_DURATION_SECONDS || '30',
  10
)
import { z } from 'zod'

// Video format validation
export const VideoFormatSchema = z.enum(['mp4', 'mov'])

// Upload status validation
export const UploadStatusSchema = z.enum(['pending', 'uploading', 'completed', 'failed'])

// Analysis status validation
export const AnalysisStatusSchema = z.enum([
  'queued',
  'processing',
  'analysis_complete',
  'completed',
  'failed',
])

// Video recording validation
export const VideoRecordingSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  original_filename: z.string().min(1).max(255).nullable(),
  file_size: z.number().int().positive(),
  duration_seconds: z.number().min(1).max(MAX_DURATION_SECONDS),
  format: VideoFormatSchema,
  storage_path: z.string().min(1),
  upload_status: UploadStatusSchema,
  upload_progress: z.number().int().min(0).max(100).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const VideoRecordingInsertSchema = VideoRecordingSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial({
  upload_status: true,
  upload_progress: true,
  metadata: true,
})

export const VideoRecordingUpdateSchema = VideoRecordingSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
}).partial()

// Upload session validation
export const UploadSessionSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().uuid(),
  video_recording_id: z.number().int().positive().nullable(),
  session_id: z.string().uuid(),
  signed_url: z.string().url(),
  expires_at: z.string(),
  bytes_uploaded: z.number().int().min(0).nullable(),
  total_bytes: z.number().int().positive(),
  chunk_size: z.number().int().positive().nullable(),
  status: z.enum(['active', 'completed', 'expired', 'cancelled']),
  created_at: z.string(),
  updated_at: z.string(),
})

// Pose keypoint validation
export const PoseKeypointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  name: z.string().min(1),
})

// Pose frame validation
export const PoseFrameSchema = z.object({
  timestamp: z.number().min(0),
  keypoints: z.array(PoseKeypointSchema),
})

// Pose data validation
export const PoseDataSchema = z.object({
  frames: z.array(PoseFrameSchema),
  metadata: z.object({
    fps: z.number().positive(),
    duration: z.number().positive(),
    total_frames: z.number().int().positive(),
  }),
})

// Analysis results validation
export const AnalysisResultsSchema = z.object({
  pose_analysis: z
    .object({
      keypoints: z.array(PoseKeypointSchema),
      confidence_score: z.number().min(0).max(1),
      frame_count: z.number().int().positive(),
    })
    .optional(),
  movement_analysis: z
    .object({
      total_movement: z.number().min(0),
      movement_quality: z.number().min(0).max(1),
      stability_score: z.number().min(0).max(1),
    })
    .optional(),
  recommendations: z
    .array(
      z.object({
        type: z.string().min(1),
        message: z.string().min(1),
        priority: z.enum(['low', 'medium', 'high']),
      })
    )
    .optional(),
})

// Analysis job validation
export const AnalysisJobSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().uuid(),
  video_recording_id: z.number().int().positive(),
  status: AnalysisStatusSchema,
  progress_percentage: z.number().int().min(0).max(100).nullable(),
  processing_started_at: z.string().nullable(),
  processing_completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  results: AnalysisResultsSchema.nullable(),
  pose_data: PoseDataSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const AnalysisJobInsertSchema = AnalysisJobSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
  progress_percentage: true,
  processing_started_at: true,
  processing_completed_at: true,
  error_message: true,
  results: true,
  pose_data: true,
})

export const AnalysisJobUpdateSchema = AnalysisJobSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
}).partial()

// Upload progress validation
export const UploadProgressSchema = z.object({
  bytesUploaded: z.number().int().min(0),
  totalBytes: z.number().int().positive(),
  percentage: z.number().int().min(0).max(100),
  status: UploadStatusSchema,
})

// Video upload options validation
export const VideoUploadOptionsSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Blob)),
  originalFilename: z.string().min(1).max(255).optional(),
  durationSeconds: z.number().int().min(1).max(MAX_DURATION_SECONDS),
  format: VideoFormatSchema,
  onProgress: z.function().optional(),
  onError: z.function().optional(),
})

// Signed URL response validation
export const SignedUploadUrlSchema = z.object({
  signedUrl: z.string().url(),
  path: z.string().min(1),
})

// Analysis statistics validation
export const AnalysisStatsSchema = z.object({
  total: z.number().int().min(0),
  completed: z.number().int().min(0),
  processing: z.number().int().min(0),
  failed: z.number().int().min(0),
  queued: z.number().int().min(0),
})

// Camera recording state validation
export const CameraRecordingStateSchema = z.enum(['idle', 'recording', 'paused', 'stopped'])

// Camera type validation
export const CameraTypeSchema = z.enum(['front', 'back'])

// Zoom level validation
export const ZoomLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

// Permission status validation
export const PermissionStatusSchema = z.enum(['granted', 'denied', 'undetermined'])

// Recording session validation
export const RecordingSessionSchema = z.object({
  id: z.string().uuid(),
  state: CameraRecordingStateSchema,
  startTime: z.number().int().positive().nullable(),
  duration: z.number().int().min(0),
  cameraType: CameraTypeSchema,
  zoomLevel: ZoomLevelSchema,
  isRecording: z.boolean(),
  isPaused: z.boolean(),
})

// Error response validation
export const ErrorResponseSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

// Type exports for convenience
export type VideoRecording = z.infer<typeof VideoRecordingSchema>
export type VideoRecordingInsert = z.infer<typeof VideoRecordingInsertSchema>
export type VideoRecordingUpdate = z.infer<typeof VideoRecordingUpdateSchema>
export type UploadSession = z.infer<typeof UploadSessionSchema>
export type PoseKeypoint = z.infer<typeof PoseKeypointSchema>
export type PoseFrame = z.infer<typeof PoseFrameSchema>
export type PoseData = z.infer<typeof PoseDataSchema>
export type AnalysisResults = z.infer<typeof AnalysisResultsSchema>
export type AnalysisJob = z.infer<typeof AnalysisJobSchema>
export type AnalysisJobInsert = z.infer<typeof AnalysisJobInsertSchema>
export type AnalysisJobUpdate = z.infer<typeof AnalysisJobUpdateSchema>
export type UploadProgress = z.infer<typeof UploadProgressSchema>
export type VideoUploadOptions = z.infer<typeof VideoUploadOptionsSchema>
export type SignedUploadUrl = z.infer<typeof SignedUploadUrlSchema>
export type AnalysisStats = z.infer<typeof AnalysisStatsSchema>
export type UploadStatus = z.infer<typeof UploadStatusSchema>
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>
export type CameraRecordingState = z.infer<typeof CameraRecordingStateSchema>
export type CameraType = z.infer<typeof CameraTypeSchema>
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>
export type PermissionStatus = z.infer<typeof PermissionStatusSchema>
export type RecordingSession = z.infer<typeof RecordingSessionSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

// Validation helper functions
export const validateVideoRecording = (data: unknown): VideoRecording => {
  return VideoRecordingSchema.parse(data)
}

export const validateAnalysisJob = (data: unknown): AnalysisJob => {
  return AnalysisJobSchema.parse(data)
}

export const validateUploadProgress = (data: unknown): UploadProgress => {
  return UploadProgressSchema.parse(data)
}

export const validateAnalysisResults = (data: unknown): AnalysisResults => {
  return AnalysisResultsSchema.parse(data)
}

export const validatePoseData = (data: unknown): PoseData => {
  return PoseDataSchema.parse(data)
}

// Gemini AI Analysis Feedback Validation
export const FeedbackCategorySchema = z.enum(['Movement', 'Posture', 'Speech', 'Vocal Variety'])

export const FeedbackItemSchema = z.object({
  timestamp: z.number().min(0),
  category: FeedbackCategorySchema,
  message: z.string().min(1).max(500), // Concise and actionable
  confidence: z.number().min(0.7).max(1.0),
  impact: z.number().min(0).max(1.0),
})

export const FeedbackListSchema = z.object({
  feedback: z.array(FeedbackItemSchema).min(1).max(10), // 1-10 feedback items
})

export const GeminiAnalysisResultSchema = z.object({
  textReport: z.string().min(1),
  feedback: z.array(FeedbackItemSchema),
  metrics: z
    .object({
      posture: z.number().min(0).max(100),
      movement: z.number().min(0).max(100),
      overall: z.number().min(0).max(100),
    })
    .optional(),
  confidence: z.number().min(0).max(1.0),
  rawResponse: z.unknown().optional(),
})

// Validation functions
export const validateFeedbackItem = (data: unknown): z.infer<typeof FeedbackItemSchema> => {
  return FeedbackItemSchema.parse(data)
}

export const validateFeedbackList = (data: unknown): z.infer<typeof FeedbackListSchema> => {
  return FeedbackListSchema.parse(data)
}

export const validateGeminiAnalysisResult = (
  data: unknown
): z.infer<typeof GeminiAnalysisResultSchema> => {
  return GeminiAnalysisResultSchema.parse(data)
}

// Safe validation functions (return null on error)
export const safeValidateFeedbackList = (
  data: unknown
): z.infer<typeof FeedbackListSchema> | null => {
  const result = FeedbackListSchema.safeParse(data)
  return result.success ? result.data : null
}

export const safeValidateGeminiAnalysisResult = (
  data: unknown
): z.infer<typeof GeminiAnalysisResultSchema> | null => {
  const result = GeminiAnalysisResultSchema.safeParse(data)
  return result.success ? result.data : null
}
