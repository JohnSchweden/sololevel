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
  PoseDetectionToggleCompact,
  PoseOverlay,
  RecordingControls,
  SideSheet,
} from '@my/ui/src/components/CameraRecording'
// Test minimal hook to isolate issue
import { log } from '@my/ui/src/utils/logger'
import { useEffect, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { YStack } from 'tamagui'
import { MVPPoseDebugOverlay } from './components/MVPPoseDebugOverlay'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
import { useKeepAwake } from './hooks/useKeepAwake'
import { useMVPPoseDetection } from './hooks/useMVPPoseDetection.minimal'
log.debug('🔍 DEBUG: Importing useMVPPoseDetection:', typeof useMVPPoseDetection)
import { useMVPPoseToggle } from './hooks/useMVPPoseToggle'
import { CameraRecordingScreenProps, RecordingState } from './types'
// import { adaptMVPPoseToProduction } from './utils/MVPTypeAdapter'

export function CameraRecordingScreen({ onNavigateBack, onTabChange }: CameraRecordingScreenProps) {
  useKeepAwake()

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
    if (__DEV__ && Math.random() < 0.01) { // Only log 1% of the time
      log.debug('🎯 MVP Pose Detection State:', debugInfo)
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

  // Show timer and chevron left when in any recording state (RECORDING or PAUSED)
  const isInRecordingState =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED

  // Track zoom level changes for debugging (removed console.log to prevent hydration issues)

  return (
    <CameraContainer
      header={
        <CameraHeader
          title={headerTitle}
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
                console.log('🎯 Toggle button pressed, poseEnabled:', poseEnabled)
              }
              togglePoseDetection()
            }}
            testID="camera-pose-toggle"
          />
        </YStack>
      </CameraPreviewArea>

      {/* Camera Controls - Conditional based on recording state */}
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
