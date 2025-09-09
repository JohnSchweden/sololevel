import {
  BottomNavigation,
  CameraContainer,
  CameraControlsOverlay,
  CameraHeader,
  CameraPreview,
  CameraPreviewArea,
  type CameraPreviewRef,
  IdleControls,
  NavigationDialog,
  RecordingControls,
  SideSheet,
  VideoPlayer,
} from '@my/ui/src/components/CameraRecording'
import { useEffect, useRef, useState } from 'react'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { CameraRecordingScreenProps, RecordingState } from './types'

export function CameraRecordingScreen({ onNavigateBack, onTabChange }: CameraRecordingScreenProps) {
  useKeepAwake()

  const cameraRef = useRef<CameraPreviewRef>(null)

  // Central permission handling
  const { permission, requestPermissionWithRationale } = useCameraPermissions({
    showRationale: true,
    enableSettingsRedirect: true,
  })

  // Track if permission request is in progress to prevent multiple requests
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  // Automatically request permission on mount if not granted
  useEffect(() => {
    if (!permission?.granted && !isRequestingPermission) {
      setIsRequestingPermission(true)
      requestPermissionWithRationale().finally(() => {
        setIsRequestingPermission(false)
      })
    }
  }, [permission?.granted, requestPermissionWithRationale, isRequestingPermission])

  const {
    cameraType,
    zoomLevel,
    showNavigationDialog,
    showSideSheet,
    activeTab,
    recordingState,
    duration,
    formattedDuration,
    isRecording,
    headerTitle,
    cameraReady,
    // Screen state transition
    videoData,
    isVideoPlayerMode,
    isCameraMode,
    handleCameraSwap,
    handleZoomChange,
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
    // Video player actions
    handleRestartRecording,
    handleContinueToAnalysis,
  } = useCameraScreenLogic({ onNavigateBack, onTabChange, cameraRef })

  // Show timer and chevron left when in any recording state (RECORDING or PAUSED)
  const isInRecordingState =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED

  // Update header title based on screen state
  const displayHeaderTitle = isVideoPlayerMode ? 'Video Playback' : headerTitle

  // Track zoom level changes for debugging (removed console.log to prevent hydration issues)

  return (
    <CameraContainer
      header={
        <CameraHeader
          title={displayHeaderTitle}
          showTimer={isInRecordingState}
          timerValue={formattedDuration}
          onMenuPress={() => setShowSideSheet(true)}
          onBackPress={handleBackPress}
          onNotificationPress={handleNavigateBack}
          isRecording={isInRecordingState}
        />
      }
      bottomNavigation={
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      }
    >
      <CameraPreviewArea isRecording={isRecording}>
        {/* Conditional rendering: Camera Preview or Video Player */}
        {isVideoPlayerMode && videoData ? (
          // Video Player Mode
          <VideoPlayer
            videoUri={videoData.videoUri}
            duration={videoData.duration}
            onRestart={handleRestartRecording}
            onContinue={handleContinueToAnalysis}
            onShare={() => {
              // TODO: Implement share functionality
            }}
            showControls={true}
            autoPlay={true}
          />
        ) : (
          // Camera Preview Mode
          <CameraPreview
            ref={cameraRef}
            cameraType={cameraType}
            isRecording={isRecording}
            zoomLevel={(zoomLevel - 1) * (1 / 3)} // Convert discrete zoom (1-3) to continuous (0-1)
            // Debug: log zoom conversion
            // zoomLevel 1 → 0.0, zoomLevel 2 → 0.33, zoomLevel 3 → 0.67
            onZoomChange={(continuousZoom) => {
              // Convert continuous zoom (0-1) back to discrete (1-3)
              // 0.0 → 1, 0.33 → 2, 0.67 → 3
              const discreteZoom = Math.round(continuousZoom * 3 + 1) as 1 | 2 | 3
              // Clamp to valid range
              const clampedZoom = Math.max(1, Math.min(3, discreteZoom)) as 1 | 2 | 3
              handleZoomChange(clampedZoom)
            }}
            permissionGranted={permission?.granted ?? false}
            onCameraReady={handleCameraReady}
            onError={(_error: string) => {
              // TODO: Handle camera errors with user feedback
            }}
          />
        )}
      </CameraPreviewArea>

      {/* Camera Controls - Only show when in camera mode, not video player mode */}
      {isCameraMode &&
        permission?.granted &&
        (recordingState === RecordingState.IDLE ? (
          <CameraControlsOverlay position="bottom">
            <IdleControls
              onStartRecording={handleStartRecording}
              onUploadVideo={handleUploadVideo}
              onVideoSelected={handleVideoSelected}
              onCameraSwap={handleCameraSwap}
              disabled={!cameraReady}
            />
          </CameraControlsOverlay>
        ) : (
          <CameraControlsOverlay position="bottom">
            <RecordingControls
              recordingState={recordingState}
              duration={duration}
              zoomLevel={zoomLevel}
              canSwapCamera={recordingState !== RecordingState.RECORDING}
              onPause={handlePauseRecording}
              onResume={handleResumeRecording}
              onStop={handleStopRecording}
              onCameraSwap={handleCameraSwap}
              onZoomChange={handleZoomChange}
              onSettingsOpen={handleSettingsOpen}
            />
          </CameraControlsOverlay>
        ))}

      {/* Navigation Confirmation Dialog */}
      <NavigationDialog
        open={showNavigationDialog}
        onOpenChange={setShowNavigationDialog}
        title="Discard Recording?"
        message="Are you sure you want to leave? Your current recording will be lost."
        onDiscard={confirmNavigation}
        onCancel={cancelNavigation}
      />

      {/* Side Sheet Navigation */}
      <SideSheet
        open={showSideSheet}
        onOpenChange={setShowSideSheet}
      />
    </CameraContainer>
  )
}
