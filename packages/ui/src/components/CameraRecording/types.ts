// Platform-agnostic camera view type
// Native: VisionCamera Camera component
// Web: HTMLVideoElement or similar
type CameraView = any

export interface CameraPreviewContainerProps {
  isRecording: boolean
  cameraType: 'front' | 'back'
  zoomLevel?: number
  onZoomChange?: (zoom: number) => void
  onCameraReady?: () => void
  onError?: (error: string) => void
  onVideoRecorded?: (videoUri: string) => void
  children?: React.ReactNode
  permissionGranted?: boolean
  /** Background image source for simulator testing */
  backgroundImage?: string | number
  /** Background image opacity (0-1) */
  backgroundOpacity?: number
}

export interface CameraPreviewRef {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>
  takePicture: () => Promise<string | null>
  getCamera: () => CameraView | null
  toggleFacing: () => Promise<void>
  setZoom: (zoom: number) => Promise<void>
  getZoom: () => Promise<number>
  pausePreview: () => void
  resumePreview: () => void
}
