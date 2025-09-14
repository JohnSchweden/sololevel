// Camera Recording Components - Phase 1 & 2 Exports
export {
  CameraContainer,
  CameraControlsOverlay,
  CameraPreviewArea,
} from './CameraContainer/CameraContainer'
export { AppHeader } from '../AppHeader/AppHeader'
export { CameraPreview } from './CameraPreview/CameraPreview'
export { PoseOverlay } from './PoseOverlay/PoseOverlay'
export {
  PoseDetectionToggle,
  PoseDetectionToggleCompact,
} from './PoseDetectionToggle/PoseDetectionToggle'
export type { CameraPreviewContainerProps, CameraPreviewRef } from './types'
export { BottomNavigation } from '../BottomNavigation/BottomNavigation'

// Phase 2 Interactive Components
export { ControlButton, IdleControls, RecordButton } from './CameraControls/IdleControls'
export { RecordingControls } from './CameraControls/RecordingControls'
export { NavigationDialog } from './CameraControls/NavigationDialog'

// Phase 3 Data Integration Components
export { VideoFilePicker } from '../VideoFilePicker/VideoFilePicker'

// Phase 4 Screen Integration Components
export { SideSheet } from '../Sidesheet/SideSheet'
export { VideoPlayer } from '../VideoPlayer/VideoPlayer'

// VideoFilePicker Props Interface
export interface VideoFilePickerProps {
  isOpen: boolean
  onVideoSelected: (file: File, metadata: any) => void
  onCancel: () => void
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  showUploadProgress?: boolean
  uploadProgress?: number
  disabled?: boolean
}
