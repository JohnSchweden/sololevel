import {
  CameraContainer,
  CameraControlsOverlay,
  CameraPreview,
  CameraPreviewArea,
  type CameraPreviewRef,
  IdleControls,
  NavigationDialog,
  RecordingControls,
} from '@my/ui/src/components/CameraRecording'

import { log } from '@my/logging'
// Import external components directly
import { AppHeader } from '@my/ui/src/components/AppHeader/AppHeader'
import { BottomNavigation } from '@my/ui/src/components/BottomNavigation/BottomNavigation'
import { SideSheet } from '@my/ui/src/components/Sidesheet/SideSheet'
import { useEffect, useRef, useState } from 'react'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { CameraRecordingScreenProps, RecordingState } from './types'

export function CameraRecordingScreen({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onTabChange,
  resetToIdle,
}: CameraRecordingScreenProps) {
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
    handleCameraSwap,
    handleZoomChange,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleStopRecording,
    canStop,
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
    handleVideoRecorded,
    resetRecording,
  } = useCameraScreenLogic({ onNavigateBack, onNavigateToVideoAnalysis, onTabChange, cameraRef })

  // Handle reset to idle state when navigating back from video analysis
  useEffect(() => {
    if (resetToIdle && recordingState !== RecordingState.IDLE) {
      log.info('CameraRecordingScreen', '🔄 Resetting to idle state due to navigation')
      resetRecording()
    }
  }, [resetToIdle, recordingState, resetRecording])

  // Show timer and chevron left when in any recording state (RECORDING or PAUSED)
  const isInRecordingState =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED

  // Determine header mode based on recording state
  const getHeaderMode = () => {
    if (isInRecordingState) return 'recording'
    if (recordingState === RecordingState.IDLE) return 'camera-idle'
    return 'camera'
  }

  // Header title
  const displayHeaderTitle = headerTitle

  // Track zoom level changes for debugging (removed log.info to prevent hydration issues)

  return (
    <CameraContainer
      header={
        <AppHeader
          title={displayHeaderTitle}
          mode={getHeaderMode()}
          showTimer={isInRecordingState}
          timerValue={formattedDuration}
          onMenuPress={() => setShowSideSheet(true)}
          onBackPress={handleBackPress}
          onNotificationPress={handleNavigateBack}
          cameraProps={{ isRecording: isInRecordingState }}
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
        {/* Camera Preview Mode */}
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
          onVideoRecorded={handleVideoRecorded}
          onError={(_error: string) => {
            // TODO: Handle camera errors with user feedback
          }}
        />
      </CameraPreviewArea>

      {/* Camera Controls */}
      {permission?.granted &&
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
              canStop={canStop}
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
