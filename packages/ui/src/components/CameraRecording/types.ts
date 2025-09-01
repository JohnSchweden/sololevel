import type { CameraView } from "expo-camera";

export interface CameraPreviewContainerProps {
  isRecording: boolean;
  cameraType: "front" | "back";
  onCameraReady?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
  permissionGranted?: boolean;
}

export interface CameraPreviewRef {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  takePicture: () => Promise<string | null>;
  getCamera: () => CameraView | null;
}
