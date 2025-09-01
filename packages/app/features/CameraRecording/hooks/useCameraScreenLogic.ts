import { log } from "@my/ui/src/utils/logger";
import { useCallback, useState } from "react";
import { CameraRecordingScreenProps, RecordingState } from "../types";
import { useCameraPermissions } from "./useCameraPermissions";
import { useRecordingStateMachine } from "./useRecordingStateMachine";

export const useCameraScreenLogic = (
  { onNavigateBack, cameraRef }: CameraRecordingScreenProps & {
    cameraRef?: any;
  },
) => {
  const [cameraType, setCameraType] = useState<"front" | "back">("back");
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [showSideSheet, setShowSideSheet] = useState(false);

  const {
    permission,
    isLoading: permissionLoading,
    error: permissionError,
    canRequestAgain,
  } = useCameraPermissions({
    showRationale: true,
    enableSettingsRedirect: true,
  });

  const {
    recordingState,
    duration,
    formattedDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    canRecord,
    canPause,
    canResume,
    canStop,
  } = useRecordingStateMachine({
    maxDurationMs: 60000, // 60 seconds
    cameraControls: cameraRef?.current
      ? {
        startRecording: cameraRef.current.startRecording,
        stopRecording: cameraRef.current.stopRecording,
        pauseRecording: cameraRef.current.pauseRecording,
        resumeRecording: cameraRef.current.resumeRecording,
      }
      : undefined,
    onMaxDurationReached: useCallback(() => {
      // TODO: Show user notification about max duration
    }, []),
    onStateChange: useCallback(
      (_state: RecordingState, _durationMs: number) => {
        // State change handled implicitly through reactive updates
      },
      [],
    ),
    onError: useCallback((error: string) => {
      log.error("useRecordingStateMachine", error);
      // TODO: Handle recording errors with user feedback
    }, []),
  });

  const handleCameraSwap = useCallback(() => {
    if (recordingState === RecordingState.RECORDING) {
      return; // Disable camera swap while recording
    }
    setCameraType((prev) => (prev === "front" ? "back" : "front"));
  }, [recordingState]);

  const handleZoomChange = useCallback((level: 1 | 2 | 3) => {
    setZoomLevel(level);
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (!canRecord) return;
    try {
      await startRecording();
    } catch (error) {
      log.warn(
        "handleStartRecording",
        `Recording not supported on this platform: ${error}`,
      );
    }
  }, [canRecord, startRecording]);

  const handlePauseRecording = useCallback(async () => {
    if (!canPause) return;
    try {
      await pauseRecording();
    } catch (error) {
      log.warn(
        "handlePauseRecording",
        `Pause recording not supported on this platform: ${error}`,
      );
    }
  }, [canPause, pauseRecording]);

  const handleResumeRecording = useCallback(async () => {
    if (!canResume) return;
    try {
      await resumeRecording();
    } catch (error) {
      log.warn(
        "handleResumeRecording",
        `Resume recording not supported on this platform: ${error}`,
      );
    }
  }, [canResume, resumeRecording]);

  const handleStopRecording = useCallback(async () => {
    if (!canStop) return;
    try {
      await stopRecording();
    } catch (error) {
      log.warn(
        "handleStopRecording",
        `Stop recording not supported on this platform: ${error}`,
      );
    }
  }, [canStop, stopRecording]);

  const handleUploadVideo = useCallback(() => {
    // TODO: Implement video upload picker
    log.info("handleUploadVideo", "Upload video clicked");
  }, []);

  const handleSettingsOpen = useCallback(() => {
    // TODO: Implement camera settings modal
    log.info("handleSettingsOpen", "Settings clicked");
  }, []);

  const handleNavigateBack = useCallback(() => {
    if (
      recordingState === RecordingState.RECORDING ||
      recordingState === RecordingState.PAUSED
    ) {
      setShowNavigationDialog(true);
      return;
    }
    onNavigateBack?.();
  }, [recordingState, onNavigateBack]);

  const confirmNavigation = useCallback(() => {
    setShowNavigationDialog(false);
    try {
      stopRecording();
      resetRecording();
    } catch (error) {
      log.warn(
        "confirmNavigation",
        `Error stopping recording on navigation: ${error}`,
      );
    }
    onNavigateBack?.();
  }, [stopRecording, resetRecording, onNavigateBack]);

  const cancelNavigation = useCallback(() => {
    setShowNavigationDialog(false);
  }, []);

  const headerTitle = recordingState === RecordingState.RECORDING ||
      recordingState === RecordingState.PAUSED
    ? formattedDuration
    : "Record";

  const isRecording = recordingState === RecordingState.RECORDING;

  return {
    cameraType,
    zoomLevel,
    showNavigationDialog,
    showSideSheet,
    permission,
    permissionLoading,
    permissionError,
    canRequestAgain,
    recordingState,
    duration,
    formattedDuration,
    isRecording,
    headerTitle,
    handleCameraSwap,
    handleZoomChange,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleStopRecording,
    handleUploadVideo,
    handleSettingsOpen,
    handleNavigateBack,
    confirmNavigation,
    cancelNavigation,
    setShowSideSheet,
    setShowNavigationDialog,
  };
};
