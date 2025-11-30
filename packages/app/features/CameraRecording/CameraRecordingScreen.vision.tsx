import {
  CameraContainer,
  CameraControlsOverlay,
  CameraPreviewArea,
  type CameraPreviewRef,
  IdleControls,
  NavigationDialog,
  // PoseDetectionToggleCompact,
  // PoseOverlay,
  RecordingControls,
} from '@ui/components/CameraRecording'

import { useStatusBar } from '@app/hooks/useStatusBar'
import { useIsFocused } from '@react-navigation/native'
//import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
// Import external components directly
import { BottomNavigation } from '@ui/components/BottomNavigation'
import { VisionCameraPreview } from '@ui/components/CameraRecording/CameraPreview/CameraPreview.native.vision'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, YStack } from 'tamagui'
// import { MVPPoseDebugOverlay } from './components/MVPPoseDebugOverlay'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useCameraScreenLogic } from './hooks/useCameraScreenLogic'
// import { useMVPPoseDetection } from './hooks/useMVPPoseDetection.minimal'
// log.debug('CameraRecordingScreen', '🔍 Importing useMVPPoseDetection', {
//   type: typeof useMVPPoseDetection,
// })

// import { useMVPPoseToggle } from './hooks/useMVPPoseToggle'
import { useTabPersistence } from './hooks/useTabPersistence'
import { CameraRecordingScreenProps, RecordingState } from './types'

// Import golf background image for iOS simulator
const golfBackgroundImage = require('../../../../apps/expo/assets/golf.png')
// import { adaptMVPPoseToProduction } from './utils/MVPTypeAdapter'

export function CameraRecordingScreen({
  onVideoProcessed,
  onHeaderStateChange,
  onBackPress,
  onDevNavigate,
  resetToIdle,
}: CameraRecordingScreenProps) {
  // Use transition to defer expensive control unmount/mount to prevent frame drops
  // This splits the work across multiple frames instead of doing it all at once
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isPending, _startTransition] = useTransition()

  // Hide status bar when this screen is focused
  useStatusBar(true, 'fade')

  //const insets = useSafeArea()
  //const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component
  const insets = useSafeAreaInsets()
  const BOTTOM_NAV_HEIGHT = 0 // Fixed height from BottomNavigationContainer

  const cameraRef = useRef<CameraPreviewRef>(null)
  const isFocused = useIsFocused()

  // PERF FIX: Pause/resume preview based on tab focus
  // Camera stays mounted but inactive when paused (no re-init on resume)
  useEffect(() => {
    if (!cameraRef.current) return

    if (isFocused) {
      cameraRef.current.resumePreview()
    } else {
      cameraRef.current.pausePreview()
    }
  }, [isFocused])

  // Get screen dimensions for pose overlay (disabled while pose detection is off)
  // const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

  // MVP Pose Detection Integration - Disabled for P1 rollout
  // const { currentPose, isDetecting, startDetection, stopDetection } = useMVPPoseDetection()
  // const { isEnabled: poseEnabled, togglePoseDetection } = useMVPPoseToggle()

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

  // MVP Pose Detection Lifecycle Management - Disabled for P1 rollout
  // useEffect(() => {
  //   if (poseEnabled && permission?.granted && !isDetecting) {
  //     startDetection().catch(() => {
  //       // Handle pose detection start error silently for MVP
  //     })
  //   } else if (!poseEnabled && isDetecting) {
  //     stopDetection()
  //   }
  // }, [poseEnabled, permission?.granted, isDetecting, startDetection, stopDetection])

  // Debug: Log pose detection state changes for integration testing - Disabled for P1 rollout
  // useEffect(() => {
  //   const debugInfo = {
  //     poseEnabled,
  //     isDetecting,
  //     hasPose: !!currentPose,
  //     permissionGranted: permission?.granted,
  //     currentPoseData: currentPose ? 'Present' : 'None',
  //   }
  //   // Reduced logging - only log state changes, not every frame
  //   if (__DEV__ && Math.random() < 0.01) {
  //     // Only log 1% of the time
  //     log.debug('CameraRecordingScreen', '🎯 MVP Pose Detection State', debugInfo)
  //   }
  // }, [poseEnabled, isDetecting, currentPose, permission?.granted])

  // Get active tab from tabs layout persistence
  const { activeTab } = useTabPersistence()

  // Get hook result
  const cameraScreenLogicResult = useCameraScreenLogic({
    onVideoProcessed,
    cameraRef,
  })

  const {
    cameraType,
    zoomLevel,
    showNavigationDialog,
    recordingState,
    duration,
    formattedDuration,
    isRecording,
    // headerTitle, // Not needed - route file provides title
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
    confirmNavigation,
    cancelNavigation,
    handleCameraReady,
    setShowNavigationDialog,
    handleVideoRecorded,
    resetRecording,
  } = cameraScreenLogicResult

  // PERF: Stable callback for VisionCameraPreview memo
  // Using useCallback ensures the camera component doesn't re-render when parent re-renders
  const handleCameraError = useCallback((_error: string) => {
    // TODO: Handle camera errors with user feedback
  }, [])

  // Handle reset to idle state when navigating back from video analysis
  useEffect(() => {
    if (resetToIdle && recordingState !== RecordingState.IDLE) {
      resetRecording()
    }
  }, [resetToIdle, recordingState, resetRecording])

  // Show timer and chevron left when in any recording state (RECORDING or PAUSED)
  const isInRecordingState =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED

  // Throttle header updates to prevent excessive navigation.setOptions() calls
  // Duration updates every ~150-250ms, but timer display only needs to update once per second
  // Use refs to track previous values to detect actual changes
  const prevFormattedDurationRef = useRef<string | undefined>(undefined)
  const prevRecordingStateRef = useRef<RecordingState | undefined>(undefined)
  const prevIsInRecordingStateRef = useRef<boolean | undefined>(undefined)
  const isInitialMountRef = useRef(true)

  // Communicate header state to route file via callback
  // Only update when values actually change:
  // - formattedDuration: when timer text changes (every second, not every tick)
  // - recordingState/isInRecordingState: when state transitions (infrequent)
  // Always update on initial mount to ensure header is configured with navigation handlers
  useEffect(() => {
    const formattedDurationChanged = prevFormattedDurationRef.current !== formattedDuration
    const recordingStateChanged = prevRecordingStateRef.current !== recordingState
    const isInRecordingStateChanged = prevIsInRecordingStateRef.current !== isInRecordingState
    const isInitialMount = isInitialMountRef.current

    // Update header if any value changed OR on initial mount
    if (
      isInitialMount ||
      formattedDurationChanged ||
      recordingStateChanged ||
      isInRecordingStateChanged
    ) {
      // Update refs
      prevFormattedDurationRef.current = formattedDuration
      prevRecordingStateRef.current = recordingState
      prevIsInRecordingStateRef.current = isInRecordingState
      isInitialMountRef.current = false

      // Update header immediately when values change (user expects updates)
      // This reduces header updates from ~4-6/sec to ~1/sec (once per second for timer)
      onHeaderStateChange?.({
        time: formattedDuration,
        mode: recordingState,
        isRecording: isInRecordingState,
      })
    }
  }, [formattedDuration, recordingState, isInRecordingState, onHeaderStateChange])

  // Share back press handler with route file via ref
  useEffect(() => {
    if (onBackPress) {
      onBackPress.current = handleBackPress
    }
  }, [onBackPress, handleBackPress])

  // Memoize RecordingControls props to prevent unnecessary re-renders
  // Note: duration is included in props for type compatibility but not actually used by RecordingControls
  // We exclude it from memo deps to prevent recreating props every ~150ms
  // Parent memoization prevents unnecessary re-renders - RecordingControls responds immediately to prop changes
  const recordingControlsProps = useMemo(
    () => ({
      recordingState,
      duration, // Included for type compatibility, but not used by component
      zoomLevel,
      canSwapCamera: recordingState !== RecordingState.RECORDING,
      canStop,
      onPause: handlePauseRecording,
      onResume: handleResumeRecording,
      onStop: handleStopRecording,
      onCameraSwap: handleCameraSwap,
      onZoomChange: handleZoomChange,
      onSettingsOpen: handleSettingsOpen,
    }),
    [
      recordingState,
      // Exclude duration - component doesn't use it, prevents memo recreation every ~150ms
      zoomLevel,
      canStop,
      handlePauseRecording,
      handleResumeRecording,
      handleStopRecording,
      handleCameraSwap,
      handleZoomChange,
      handleSettingsOpen,
    ]
  )

  // Track zoom level changes for debugging (removed log.info to prevent hydration issues)

  // Add bottom padding on Android to prevent BottomNavigation from being covered by system navigation
  const bottomPadding = Platform.OS === 'android' ? BOTTOM_NAV_HEIGHT + insets.bottom : 0

  return (
    <YStack
      flex={1}
      //paddingTop={insets.top + APP_HEADER_HEIGHT}
      paddingBottom={bottomPadding}
      backgroundColor="transparent"
    >
      <CameraContainer
        testID="camera-container"
        bottomNavigation={
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={() => {
              // Tab changes handled by tabs layout - this is a no-op
            }}
          />
        }
      >
        <CameraPreviewArea isRecording={isRecording}>
          {/* Camera Preview Mode */}
          <VisionCameraPreview
            ref={cameraRef}
            cameraType={cameraType}
            isRecording={isRecording}
            recordingState={recordingState}
            zoomLevel={zoomLevel} // Pass current zoom level for display purposes
            permissionGranted={permission?.granted ?? false}
            onCameraReady={handleCameraReady}
            onVideoRecorded={handleVideoRecorded}
            onError={handleCameraError}
            backgroundImage={golfBackgroundImage}
            backgroundOpacity={1}
          />

          {/* MVP Pose Detection Overlay - Disabled for P1 */}
          {/* {poseEnabled && currentPose && (
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
          )} */}

          {/* MVP Debug Overlay - Disabled for P1 */}
          {/* <MVPPoseDebugOverlay
            pose={currentPose}
            isDetecting={isDetecting}
            isEnabled={poseEnabled}
          /> */}

          {/* MVP Pose Detection Toggle - Disabled for P1 */}
          {/* <YStack
            position="absolute"
            top={250}
            right={20}
            zIndex={10}
          >
            <PoseDetectionToggleCompact
              isEnabled={poseEnabled}
              onToggle={() => {
                togglePoseDetection()
              }}
              testID="camera-pose-toggle"
            />
          </YStack> */}
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
              <RecordingControls {...recordingControlsProps} />
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

        {/* Dev buttons for testing - navigation via callback */}
        {__DEV__ && onDevNavigate && (
          <YStack
            position="absolute"
            top={120}
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
              onPress={() => onDevNavigate('/dev/compress-test')}
              testID="dev-compress-test-button"
              pressStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              🚀 DEV COMPRESSION TEST
            </Button>
            <Button
              size="$4"
              backgroundColor="transparent"
              color="white"
              onPress={() => onDevNavigate('/dev/pipeline-test')}
              testID="dev-pipeline-test-button"
              pressStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              🔧 PIPELINE TEST
            </Button>
          </YStack>
        )}
      </CameraContainer>
    </YStack>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  CameraRecordingScreen.whyDidYouRender = false
}
