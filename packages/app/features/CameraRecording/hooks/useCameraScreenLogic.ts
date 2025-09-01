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

  const handleResetZoom = useCallback(() => {
    console.log("useCameraScreenLogic handleResetZoom: resetting to level 1");
    setZoomLevel(1);
  }, []);
  const [activeTab, setActiveTab] = useState<"coach" | "record" | "insights">(
    "record",
  );
  const [cameraReady, setCameraReady] = useState(false);

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
    onResetZoom: handleResetZoom,
  });

  const handleCameraSwap = useCallback(async () => {
    if (recordingState === RecordingState.RECORDING) {
      return; // Disable camera swap while recording
    }

    try {
      // Simply update the camera type state - the CameraPreview component will handle the change
      // via its 'facing' prop rather than trying to use toggleFacing which is unreliable
      setCameraType((prev) => (prev === "front" ? "back" : "front"));
      log.info("handleCameraSwap", "Camera facing changed", {
        newType: cameraType === "front" ? "back" : "front",
      });
    } catch (error) {
      log.error("handleCameraSwap", "Failed to change camera facing", error);
    }
  }, [recordingState, cameraType]);

  const handleZoomChange = useCallback((level: 1 | 2 | 3) => {
    console.log("useCameraScreenLogic handleZoomChange:", {
      level,
      previousZoomLevel: zoomLevel,
    });
    setZoomLevel(level);
  }, [zoomLevel]);

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

  const handleBackPress = useCallback(async () => {
    if (!canStop) return;
    try {
      await stopRecording();
      // After stopping, reset to idle state
      resetRecording();
      log.info("handleBackPress", "Recording stopped and reset to idle state");
    } catch (error) {
      log.warn(
        "handleBackPress",
        `Stop recording and reset failed: ${error}`,
      );
    }
  }, [canStop, stopRecording, resetRecording]);

  const handleUploadVideo = useCallback(() => {
    // Legacy callback for backward compatibility
    log.info("handleUploadVideo", "Upload video clicked");
  }, []);

  const handleVideoSelected = useCallback((file: File, metadata: any) => {
    log.info("handleVideoSelected", "Video selected for upload", {
      fileName: file.name,
      fileSize: file.size,
      duration: metadata?.duration,
    });

    // TODO: Implement actual upload logic using VideoUploadService
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

  const handleTabChange = useCallback(
    (tab: "coach" | "record" | "insights") => {
      setActiveTab(tab);
      onNavigateBack?.(); // Navigate back when switching tabs
    },
    [onNavigateBack],
  );

  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    log.info("useCameraScreenLogic", "Camera is ready for recording");
  }, []);

  const headerTitle = recordingState === RecordingState.RECORDING ||
      recordingState === RecordingState.PAUSED
    ? formattedDuration
    : "Solo:Level";

  const isRecording = recordingState === RecordingState.RECORDING;

  return {
    cameraType,
    zoomLevel,
    showNavigationDialog,
    showSideSheet,
    activeTab,
    permission,
    permissionLoading,
    permissionError,
    canRequestAgain,
    recordingState,
    duration,
    formattedDuration,
    isRecording,
    headerTitle,
    cameraReady,
    handleCameraSwap,
    handleZoomChange,
    handleResetZoom,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleStopRecording,
    handleBackPress,
    handleUploadVideo,
    handleVideoSelected,
    handleSettingsOpen,
    handleNavigateBack,
    confirmNavigation,
    cancelNavigation,
    handleTabChange,
    handleCameraReady,
    setShowSideSheet,
    setShowNavigationDialog,
  };
};
