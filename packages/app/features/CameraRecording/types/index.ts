import { z } from 'zod'
// Camera Recording Types
import { MAX_RECORDING_DURATION_MS } from '../config/recordingConfig'

// Permission Status Types
export enum CameraPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
  RESTRICTED = 'restricted',
}

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export type ScreenState = 'camera' | 'videoPlayer'

/**
 * Header state for dynamic header updates
 * Route file receives this via callback and updates header
 */
export interface HeaderState {
  /** Recording timer display (e.g., "00:15") */
  time: string
  /** Recording mode indicator */
  mode: RecordingState
  /** Whether recording is in progress (for header styling) */
  isRecording: boolean
}

// Core TypeScript Interfaces
export interface CameraRecordingScreenProps {
  /**
   * Callback when video is processed and ready for analysis
   * Route file handles navigation with router.push()
   */
  onVideoProcessed?: (videoUri: string) => void

  /**
   * Callback to update header state (timer, mode indicator)
   * Route file receives state and calls navigation.setOptions()
   */
  onHeaderStateChange?: (state: HeaderState) => void

  /**
   * Callback when back button is pressed during recording
   * Stops recording and resets to idle state
   */
  onBackPress?: React.MutableRefObject<(() => Promise<void>) | null>

  /**
   * Callback for dev navigation (compression test, pipeline test, etc.)
   * Route file handles navigation with router.push()
   */
  onDevNavigate?: (route: string) => void

  /**
   * Reset camera to idle state (from URL params)
   * Used when navigating back from video analysis
   */
  resetToIdle?: boolean

  // Camera state - optional for placeholder component
  cameraPermission?: CameraPermissionStatus
  recordingState?: RecordingState
  recordingDuration?: number

  // Camera controls - optional for placeholder component
  cameraType?: 'front' | 'back'
  zoomLevel?: 1 | 2 | 3
  onCameraSwap?: () => void
  onZoomChange?: (level: 1 | 2 | 3) => void

  // Recording actions
  onStartRecording?: () => void
  onPauseRecording?: () => void
  onStopRecording?: () => void
  onUploadVideo?: () => void
}

export interface PoseKeypoint {
  x: number
  y: number
  confidence: number
}

export interface PoseOverlayProps {
  keypoints: PoseKeypoint[]
  canvasSize: { width: number; height: number }
  confidenceThreshold?: number
}

export interface RecordingControlsProps {
  state: RecordingState
  duration: number
  zoomLevel: 1 | 2 | 3
  canSwapCamera: boolean
  onRecord?: () => void
  onPause?: () => void
  onStop?: () => void
  onUpload?: () => void
  onCameraSwap?: () => void
  onZoomChange?: (level: 1 | 2 | 3) => void
}

// CameraHeaderProps removed - now using AppHeaderProps from @my/ui/components/AppHeader

export interface CameraPreviewContainerProps {
  isRecording: boolean
  cameraType: 'front' | 'back'
  onCameraReady?: () => void
  onError?: (error: string) => void
  children?: React.ReactNode
}

// Zod Schemas for Runtime Validation
export const recordingStateSchema = z.nativeEnum(RecordingState)

export const cameraSettingsSchema = z.object({
  cameraType: z.enum(['front', 'back']),
  zoomLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  flashEnabled: z.boolean().optional(),
  gridEnabled: z.boolean().optional(),
})

export const recordingSessionSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime(),
  duration: z.number().min(0).max(MAX_RECORDING_DURATION_MS),
  state: recordingStateSchema,
  filePath: z.string().optional(),
})

export const uploadProgressSchema = z.object({
  bytesUploaded: z.number().min(0),
  totalBytes: z.number().positive(),
  percentage: z.number().min(0).max(100),
  isComplete: z.boolean(),
  error: z.string().optional(),
})

export type CameraSettings = z.infer<typeof cameraSettingsSchema>
export type RecordingSession = z.infer<typeof recordingSessionSchema>
export type UploadProgress = z.infer<typeof uploadProgressSchema>
