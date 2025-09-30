import {
  CameraContainer,
  CameraControlsOverlay,
  CameraPreview,
  CameraPreviewArea,
  type CameraPreviewRef,
  IdleControls,
  NavigationDialog,
  PoseDetectionToggleCompact,
  PoseOverlay,
  RecordingControls,
} from '@ui/components/CameraRecording'

// Test minimal hook to isolate issue
import { log } from '@my/logging'
// Import external components directly
import { AppHeader } from '@ui/components/AppHeader'
import { BottomNavigation } from '@ui/components/BottomNavigation'
import { SideSheet } from '@ui/components/Sidesheet'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { Button, YStack } from 'tamagui'
import { MVPPoseDebugOverlay } from './components/MVPPoseDebugOverlay'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { useMVPPoseDetection } from './hooks/useMVPPoseDetection.minimal'
log.debug('CameraRecordingScreen', '🔍 Importing useMVPPoseDetection', {
  type: typeof useMVPPoseDetection,
})
import { useMVPPoseToggle } from './hooks/useMVPPoseToggle'
import { CameraRecordingScreenProps, RecordingState } from './types'
// import { adaptMVPPoseToProduction } from './utils/MVPTypeAdapter'

export function CameraRecordingScreen({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onTabChange,
  resetToIdle,
}: CameraRecordingScreenProps) {
  useKeepAwake()
  const router = useRouter()

  const cameraRef = useRef<CameraPreviewRef>(null)

  // Get screen dimensions for pose overlay
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

  // MVP Pose Detection Integration - Test fixed hook
  const { currentPose, isDetecting, startDetection, stopDetection } = useMVPPoseDetection()
  const { isEnabled: poseEnabled, togglePoseDetection } = useMVPPoseToggle()

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

  // MVP Pose Detection Lifecycle Management
  useEffect(() => {
    if (poseEnabled && permission?.granted && !isDetecting) {
      startDetection().catch(() => {
        // Handle pose detection start error silently for MVP
      })
    } else if (!poseEnabled && isDetecting) {
      stopDetection()
    }
  }, [poseEnabled, permission?.granted, isDetecting, startDetection, stopDetection])

  // Debug: Log pose detection state changes for integration testing
  useEffect(() => {
    const debugInfo = {
      poseEnabled,
      isDetecting,
      hasPose: !!currentPose,
      permissionGranted: permission?.granted,
      currentPoseData: currentPose ? 'Present' : 'None',
    }
    // Reduced logging - only log state changes, not every frame
    if (__DEV__ && Math.random() < 0.01) {
      // Only log 1% of the time
      log.debug('CameraRecordingScreen', '🎯 MVP Pose Detection State', debugInfo)
    }
  }, [poseEnabled, isDetecting, currentPose, permission?.granted])

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
    // Camera swap visual feedback
    isCameraSwapping,
    cameraSwapTransitionDuration,
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
      testID="camera-container"
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
          zoomLevel={zoomLevel} // Pass current zoom level for display purposes
          permissionGranted={permission?.granted ?? false}
          onCameraReady={handleCameraReady}
          onVideoRecorded={handleVideoRecorded}
          onError={(_error: string) => {
            // TODO: Handle camera errors with user feedback
          }}
        />

        {/* MVP Pose Detection Overlay */}
        {poseEnabled && currentPose && (
          <PoseOverlay
            pose={currentPose}
            width={screenWidth}
            height={screenHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 5, // Above camera but below controls
            }}
          />
        )}

        {/* MVP Debug Overlay - Development Only */}
        <MVPPoseDebugOverlay
          pose={currentPose}
          isDetecting={isDetecting}
          isEnabled={poseEnabled}
        />

        {/* MVP Pose Detection Toggle - Below Debug Overlay */}
        <YStack
          position="absolute"
          top={250}
          right={20}
          zIndex={10}
        >
          <PoseDetectionToggleCompact
            isEnabled={poseEnabled}
            onToggle={() => {
              if (__DEV__) {
                log.debug(
                  'CameraRecordingScreen',
                  '🎯 Toggle button pressed, poseEnabled:',
                  poseEnabled
                )
              }
              togglePoseDetection()
            }}
            testID="camera-pose-toggle"
          />
        </YStack>
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
              isCameraSwapping={isCameraSwapping}
              cameraSwapTransitionDuration={cameraSwapTransitionDuration}
              testID="idle-controls"
              recordButtonTestID="record-button"
              uploadButtonTestID="upload-button"
              cameraSwapButtonTestID="camera-swap-button"
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

      {/* Dev button for compression test */}
      {__DEV__ && (
        <YStack
          position="absolute"
          top={100}
          left={20}
          zIndex={10000}
          backgroundColor="$red9"
          padding="$2"
          borderRadius="$4"
        >
          <Button
            size="$4"
            backgroundColor="transparent"
            color="white"
            onPress={() => router.push('/dev/compress-test')}
            testID="dev-compress-test-button"
            pressStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            🚀 DEV COMPRESSION TEST
          </Button>
          <Button
            size="$4"
            backgroundColor="transparent"
            color="white"
            onPress={() => router.push('/dev/pipeline-test')}
            testID="dev-pipeline-test-button"
            pressStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            🔧 PIPELINE TEST
          </Button>
        </YStack>
      )}
    </CameraContainer>
  )
}
