import {
  BottomNavigation,
  CameraContainer,
  CameraControlsOverlay,
  CameraHeader,
  CameraPreview,
  CameraPreviewArea,
  IdleControls,
  NavigationDialog,
  RecordingControls,
} from '@my/ui'
import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import { Button, Text, YStack } from 'tamagui'
import { useCameraControls } from './hooks/useCameraControls'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { useRecordingStateMachine } from './hooks/useRecordingStateMachine'
import { type CameraRecordingScreenProps, RecordingState } from './types'

/**
 * Enhanced Camera Recording Screen - Phase 2 Implementation
 * Integrates interactive elements: recording controls, camera swap, zoom, navigation confirmation
 * Ready for Phase 3: Data Integration
 */
export function EnhancedCameraRecordingScreen({
  onNavigateBack,
  onOpenSideSheet,
  onTabChange,
}: Partial<CameraRecordingScreenProps>) {
  // Phase 2: Interactive state management
  const [activeTab, setActiveTab] = useState<'coach' | 'record' | 'insights'>('record')
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Camera permissions hook
  const { permissions, actions, hasAllPermissions } = useCameraPermissions()

  // Recording state machine with 60s limit
  const recording = useRecordingStateMachine({
    maxDurationMs: 60 * 1000, // 60 seconds
    onMaxDurationReached: () => {
      Alert.alert(
        'Recording Complete',
        "You've reached the maximum recording time of 60 seconds.",
        [{ text: 'OK' }]
      )
    },
    onStateChange: (_state: RecordingState, _duration: number) => {
      // State change handled by hook internally
    },
    onError: (error: string) => {
      Alert.alert('Recording Error', error, [{ text: 'OK' }])
    },
  })

  // Camera controls (swap, zoom, settings)
  const camera = useCameraControls({
    initialCameraType: 'back',
    allowCameraSwapDuringRecording: false, // Disable swap during recording per US-RU-09b
    onCameraSwap: (_newType: 'front' | 'back') => {
      // Camera swap handled by hook internally
    },
    onZoomChange: (_level: 1 | 2 | 3) => {
      // Zoom change handled by hook internally
    },
    onError: (error: string) => {
      Alert.alert('Camera Error', error, [{ text: 'OK' }])
    },
  })

  // Navigation with confirmation for active recordings
  const handleNavigation = useCallback(
    (navigationFn: () => void) => {
      if (
        recording.recordingState === RecordingState.RECORDING ||
        recording.recordingState === RecordingState.PAUSED
      ) {
        setPendingNavigation(() => navigationFn)
        setShowNavigationDialog(true)
      } else {
        navigationFn()
      }
    },
    [recording.recordingState]
  )

  const handleNavigationConfirm = useCallback(() => {
    recording.resetRecording()
    setShowNavigationDialog(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }, [recording, pendingNavigation])

  const handleNavigationCancel = useCallback(() => {
    setShowNavigationDialog(false)
    setPendingNavigation(null)
  }, [])

  const handleTabChange = useCallback(
    (tab: 'coach' | 'record' | 'insights') => {
      handleNavigation(() => {
        setActiveTab(tab)
        onTabChange?.(tab)
      })
    },
    [handleNavigation, onTabChange]
  )

  const handleBackNavigation = useCallback(() => {
    handleNavigation(() => {
      onNavigateBack?.()
    })
  }, [handleNavigation, onNavigateBack])

  const handleSideSheetOpen = useCallback(() => {
    handleNavigation(() => {
      onOpenSideSheet?.()
    })
  }, [handleNavigation, onOpenSideSheet])

  // Camera event handlers
  const handleCameraReady = useCallback(() => {
    // Camera ready - no action needed
  }, [])

  const handleCameraError = useCallback((error: string) => {
    Alert.alert('Camera Error', error, [{ text: 'OK' }])
  }, [])

  // Recording control handlers
  const handleStartRecording = useCallback(() => {
    recording.startRecording()
  }, [recording])

  const handleUploadVideo = useCallback(() => {
    // Phase 3: Video upload implementation
    Alert.alert('Upload Video', 'Video upload will be implemented in Phase 3: Data Integration', [
      { text: 'OK' },
    ])
  }, [])

  // Render permission request screen
  if (!hasAllPermissions && permissions.camera !== 'granted') {
    return (
      <CameraContainer
        header={
          <CameraHeader
            title="Camera Permission"
            onMenuPress={handleBackNavigation}
            onNotificationPress={() => console.log('Notifications - Phase 3')}
          />
        }
        bottomNavigation={
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            disabled={true}
          />
        }
      >
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="$4"
          gap="$4"
        >
          <Text
            fontSize="$6"
            fontWeight="600"
            textAlign="center"
          >
            Camera Access Required
          </Text>

          <Text
            fontSize="$4"
            color="$color11"
            textAlign="center"
          >
            This app needs camera and microphone access to record videos for AI analysis.
          </Text>

          <Button
            size="$5"
            onPress={actions.requestAllPermissions}
            minHeight={44}
            disabled={permissions.isLoading}
          >
            {permissions.isLoading ? 'Requesting...' : 'Grant Permissions'}
          </Button>

          <Button
            variant="outlined"
            size="$4"
            onPress={actions.openSettings}
            minHeight={44}
          >
            Open Settings
          </Button>
        </YStack>
      </CameraContainer>
    )
  }

  // Main enhanced camera recording screen
  return (
    <>
      <CameraContainer
        header={
          <CameraHeader
            title="Solo:Level"
            showTimer={recording.recordingState !== RecordingState.IDLE}
            timerValue={recording.formattedDuration}
            onMenuPress={handleSideSheetOpen}
            onNotificationPress={() => console.log('Notifications - Phase 3')}
            notificationBadgeCount={0}
          />
        }
        bottomNavigation={
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        }
      >
        <CameraPreviewArea isRecording={recording.recordingState === RecordingState.RECORDING}>
          <CameraPreview
            isRecording={recording.recordingState === RecordingState.RECORDING}
            cameraType={camera.controls.cameraType}
            onCameraReady={handleCameraReady}
            onError={handleCameraError}
          >
            {/* Camera Controls Overlay - Conditional rendering based on state */}
            <CameraControlsOverlay position="bottom">
              {recording.recordingState === RecordingState.IDLE ? (
                <IdleControls
                  onStartRecording={handleStartRecording}
                  onUploadVideo={handleUploadVideo}
                  onCameraSwap={camera.actions.swapCamera}
                  disabled={false}
                  cameraSwapDisabled={camera.controls.isSwapping}
                />
              ) : (
                <RecordingControls
                  recordingState={recording.recordingState}
                  duration={recording.duration}
                  zoomLevel={camera.controls.zoomLevel}
                  canSwapCamera={camera.canSwapCamera}
                  formattedDuration={recording.formattedDuration}
                  onPause={recording.pauseRecording}
                  onResume={recording.resumeRecording}
                  onStop={recording.stopRecording}
                  onCameraSwap={camera.actions.swapCamera}
                  onZoomChange={camera.actions.setZoomLevel}
                  onSettingsOpen={() =>
                    Alert.alert(
                      'Camera Settings',
                      'Settings modal will be implemented in Phase 3',
                      [{ text: 'OK' }]
                    )
                  }
                />
              )}
            </CameraControlsOverlay>
          </CameraPreview>
        </CameraPreviewArea>
      </CameraContainer>

      {/* Navigation Confirmation Dialog */}
      <NavigationDialog
        open={showNavigationDialog}
        onOpenChange={setShowNavigationDialog}
        onDiscard={handleNavigationConfirm}
        onCancel={handleNavigationCancel}
        recordingDuration={recording.duration}
      />
    </>
  )
}
