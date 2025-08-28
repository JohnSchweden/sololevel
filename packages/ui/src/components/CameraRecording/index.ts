// Camera Recording Components - Phase 1 & 2 Exports
export {
  CameraContainer,
  CameraControlsOverlay,
  CameraPreviewArea,
} from './CameraContainer'
export { CameraHeader, RecordingTimer } from './CameraHeader'
export { CameraPreview } from './CameraPreview'
export { BottomNavigation, TabBar } from './BottomNavigation'

// Phase 2 Interactive Components
export { ControlButton, IdleControls, RecordButton } from './IdleControls'
export { RecordingControls, ZoomControls } from './RecordingControls'
export { ConfirmationDialog, NavigationDialog } from './NavigationDialog'

// Note: Types and hooks are imported directly from @app to avoid circular dependencies
