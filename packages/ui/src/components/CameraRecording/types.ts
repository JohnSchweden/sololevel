// Platform-agnostic camera view type
type CameraView = any

export interface CameraPreviewContainerProps {
  isRecording: boolean
  cameraType: 'front' | 'back'
  zoomLevel?: number
  onZoomChange?: (zoom: number) => void
  onCameraReady?: () => void
  onError?: (error: string) => void
  children?: React.ReactNode
  permissionGranted?: boolean
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
}
