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
} from '@my/ui/src/components/CameraRecording'
import { useEffect, useRef } from 'react'
import { YStack } from 'tamagui'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { CameraRecordingScreenProps, RecordingState } from './types'

export function CameraRecordingScreen({ onNavigateBack, onTabChange }: CameraRecordingScreenProps) {
  useKeepAwake()

  const cameraRef = useRef<CameraPreviewRef>(null)

  const {
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
  } = useCameraScreenLogic({ onNavigateBack, onTabChange, cameraRef })

  // Debug: log zoom level changes
  useEffect(() => {
    console.log('CameraRecordingScreen zoomLevel changed:', {
      zoomLevel,
      cameraZoom: (zoomLevel - 1) * (1 / 3),
    })
  }, [zoomLevel])

  return (
    <CameraContainer
      header={
        <CameraHeader
          title={headerTitle}
          showTimer={isRecording}
          timerValue={formattedDuration}
          onMenuPress={() => setShowSideSheet(true)}
          onBackPress={handleBackPress}
          onNotificationPress={handleNavigateBack}
          isRecording={isRecording}
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
            console.log('Zoom conversion:', {
              continuousZoom,
              discreteZoom,
              clampedZoom,
              originalZoomLevel: zoomLevel,
            })
            handleZoomChange(clampedZoom)
          }}
          permissionGranted={permission?.granted ?? false}
          onCameraReady={handleCameraReady}
          onError={(_error: string) => {
            // TODO: Handle camera errors with user feedback
          }}
        />
      </CameraPreviewArea>

      {/* Permission Loading/Error States */}
      {permissionLoading && (
        <CameraControlsOverlay position="center">
          <YStack
            alignItems="center"
            gap="$4"
          >
            {/* TODO: Add permission loading UI */}
          </YStack>
        </CameraControlsOverlay>
      )}

      {permissionError && (
        <CameraControlsOverlay position="center">
          <YStack
            alignItems="center"
            gap="$4"
          >
            {/* TODO: Add permission error UI */}
          </YStack>
        </CameraControlsOverlay>
      )}

      {/* Permission Request UI */}
      {!permission?.granted && !permissionLoading && canRequestAgain && (
        <CameraControlsOverlay position="center">
          <YStack
            alignItems="center"
            gap="$4"
          >
            {/* TODO: Add permission request UI */}
          </YStack>
        </CameraControlsOverlay>
      )}

      {/* Camera Controls - Conditional based on recording state */}
      {permission?.granted &&
        (recordingState === RecordingState.IDLE ? (
          <CameraControlsOverlay position="bottom">
            <IdleControls
              onStartRecording={handleStartRecording}
              onUploadVideo={handleUploadVideo}
              onVideoSelected={handleVideoSelected}
              onCameraSwap={handleCameraSwap}
              disabled={permissionLoading || !cameraReady}
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
