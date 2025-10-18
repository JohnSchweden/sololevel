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
import { BottomNavigation } from '@my/ui/src/components/BottomNavigation/BottomNavigation'
import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation } from 'expo-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { YStack } from 'tamagui'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { useTabPersistence } from './hooks/useTabPersistence'
import { CameraRecordingScreenProps, RecordingState } from './types'

// Import golf background image for iOS simulator
const golfBackgroundImage = require('../../../../apps/expo/assets/golf.png')

export function CameraRecordingScreen({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onNavigateToHistory,
  resetToIdle,
}: CameraRecordingScreenProps) {
  useKeepAwake()
  const navigation = useNavigation()
  const headerHeight = useHeaderHeight()

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

  // Get active tab from tabs layout persistence
  const { activeTab } = useTabPersistence()

  const {
    cameraType,
    zoomLevel,
    showNavigationDialog,
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
    handleCameraReady,
    setShowNavigationDialog,
    handleVideoRecorded,
    resetRecording,
  } = useCameraScreenLogic({
    onNavigateBack,
    onNavigateToVideoAnalysis,
    onNavigateToHistory,
    cameraRef,
  })

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

  // Update navigation header dynamically based on recording state
  useLayoutEffect(() => {
    navigation.setOptions({
      // @ts-ignore: custom appHeaderProps not in base type
      appHeaderProps: {
        title: displayHeaderTitle,
        mode: getHeaderMode(),
        showTimer: isInRecordingState,
        timerValue: formattedDuration,
        leftAction: isInRecordingState ? 'back' : 'sidesheet',
        onMenuPress: () => onNavigateToHistory?.(),
        onBackPress: handleBackPress,
        onNotificationPress: handleNavigateBack,
        cameraProps: { isRecording: isInRecordingState },
      },
    })
  }, [
    navigation,
    displayHeaderTitle,
    isInRecordingState,
    formattedDuration,
    recordingState,
    handleBackPress,
    onNavigateToHistory,
    handleNavigateBack,
  ])

  // Track zoom level changes for debugging (removed log.info to prevent hydration issues)

  return (
    <YStack
      flex={1}
      paddingTop={headerHeight}
      backgroundColor="$background"
    >
      <CameraContainer
        bottomNavigation={
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={() => {
              // Tab changes handled by tabs layout - this is a no-op
              log.debug('CameraRecordingScreen', 'Tab change ignored - handled by tabs layout')
            }}
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
            backgroundImage={golfBackgroundImage}
            backgroundOpacity={0.2}
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
      </CameraContainer>
    </YStack>
  )
}
