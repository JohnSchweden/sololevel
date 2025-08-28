// Camera Recording Types
import { z } from 'zod'

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

// Core TypeScript Interfaces
export interface CameraRecordingScreenProps {
  // Navigation
  onNavigateBack?: () => void
  onOpenSideSheet?: () => void
  onTabChange?: (tab: 'coach' | 'record' | 'insights') => void

  // Camera state
  cameraPermission: CameraPermissionStatus
  recordingState: RecordingState
  recordingDuration: number

  // Camera controls
  cameraType: 'front' | 'back'
  zoomLevel: 1 | 2 | 3
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
  onSettingsOpen?: () => void
}

export interface CameraHeaderProps {
  title: string
  showTimer?: boolean
  timerValue?: string
  onMenuPress?: () => void
  onNotificationPress?: () => void
  notificationBadgeCount?: number
}

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
  duration: z.number().min(0).max(60000), // Max 60 seconds in milliseconds
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
