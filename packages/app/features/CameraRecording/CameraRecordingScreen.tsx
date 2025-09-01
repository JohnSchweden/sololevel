import {
  BottomNavigation,
  CameraContainer,
  CameraHeader,
  CameraPreview,
  type CameraPreviewRef,
  IdleControls,
  NavigationDialog,
  RecordingControls,
  SideSheet,
} from '@my/ui/src/components/CameraRecording'
import { useRef } from 'react'
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
  } = useCameraScreenLogic({ onNavigateBack, onTabChange, cameraRef })

  return (
    <CameraContainer
      header={
        <CameraHeader
          title={headerTitle}
          showTimer={isRecording}
          timerValue={formattedDuration}
          onMenuPress={handleNavigateBack}
          onNotificationPress={() => setShowSideSheet(true)}
        />
      }
      bottomNavigation={
        <BottomNavigation
          activeTab="record"
          onTabChange={onTabChange || (() => {})}
        />
      }
    >
      <CameraPreview
        ref={cameraRef}
        cameraType={cameraType}
        isRecording={isRecording}
        permissionGranted={permission?.granted ?? false}
        onCameraReady={() => {
          // Camera is ready for use
        }}
        onError={(_error: string) => {
          // TODO: Handle camera errors with user feedback
        }}
      />

      {/* Permission Loading/Error States */}
      {permissionLoading && (
        <YStack
          position="absolute"
          top="50%"
          left="50%"
          transform={[{ translateX: -50 }, { translateY: -50 }]}
          alignItems="center"
          gap="$4"
        >
          {/* TODO: Add permission loading UI */}
        </YStack>
      )}

      {permissionError && (
        <YStack
          position="absolute"
          top="50%"
          left="50%"
          transform={[{ translateX: -50 }, { translateY: -50 }]}
          alignItems="center"
          gap="$4"
        >
          {/* TODO: Add permission error UI */}
        </YStack>
      )}

      {/* Permission Request UI */}
      {!permission?.granted && !permissionLoading && canRequestAgain && (
        <YStack
          position="absolute"
          top="50%"
          left="50%"
          transform={[{ translateX: -50 }, { translateY: -50 }]}
          alignItems="center"
          gap="$4"
        >
          {/* TODO: Add permission request UI */}
        </YStack>
      )}

      {/* Camera Controls - Conditional based on recording state */}
      {permission?.granted &&
        (recordingState === RecordingState.IDLE ? (
          <IdleControls
            onStartRecording={handleStartRecording}
            onUploadVideo={handleUploadVideo}
            onCameraSwap={handleCameraSwap}
            disabled={permissionLoading}
          />
        ) : (
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
