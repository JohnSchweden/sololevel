// Camera Recording Components - Phase 1 & 2 Exports
export { CameraContainer } from "./CameraContainer";
export { CameraHeader } from "./CameraHeader";
export { CameraPreview } from "./CameraPreview";
export type { CameraPreviewContainerProps, CameraPreviewRef } from "./types";
export { BottomNavigation } from "./BottomNavigation";

// Phase 2 Interactive Components
export { ControlButton, IdleControls, RecordButton } from "./IdleControls";
export { RecordingControls } from "./RecordingControls";
export { NavigationDialog } from "./NavigationDialog";

// Phase 3 Data Integration Components
export { VideoFilePicker } from "./VideoFilePicker";

// Phase 4 Screen Integration Components
export { SideSheet } from "./SideSheet";
export { PostRecordingPlayback } from "./PostRecordingPlayback";

// VideoFilePicker Props Interface
export interface VideoFilePickerProps {
  isOpen: boolean;
  onVideoSelected: (file: File, metadata: any) => void;
  onCancel: () => void;
  maxDurationSeconds?: number;
  maxFileSizeBytes?: number;
  showUploadProgress?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
}
