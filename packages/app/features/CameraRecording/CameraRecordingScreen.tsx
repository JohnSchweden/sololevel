import { useState } from 'react'
import {
  CameraContainer,
  CameraPreviewArea,
  CameraHeader,
  CameraPreview,
  BottomNavigation,
} from '@my/ui'
import { useCameraPermissions } from './hooks/useCameraPermissions'
import { RecordingState, type CameraRecordingScreenProps } from './types'
import { YStack, Text, Button } from 'tamagui'
import { Circle, SwitchCamera } from '@tamagui/lucide-icons'

/**
 * Camera Recording Screen - Phase 1 Implementation
 * Mobile-first screen with foundation components implemented
 * Ready for Phase 2: Interactive Elements
 */
export function CameraRecordingScreen({
  onNavigateBack,
  onOpenSideSheet,
  onTabChange,
}: Partial<CameraRecordingScreenProps>) {
  // Phase 1: Foundation state management
  const [recordingState] = useState<RecordingState>(RecordingState.IDLE)
  const [recordingDuration] = useState(0)
  const [activeTab, setActiveTab] = useState<'coach' | 'record' | 'insights'>('record')
  const [cameraType] = useState<'front' | 'back'>('back')

  // Camera permissions hook
  const { permissions, actions, hasAllPermissions } = useCameraPermissions()

  const handleTabChange = (tab: 'coach' | 'record' | 'insights') => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }

  const handleCameraReady = () => {}

  const handleCameraError = (error: string) => {
    console.error('Camera error:', error)
    // Phase 2: Implement proper error handling
  }

  // Render permission request screen
  if (!hasAllPermissions && permissions.camera !== 'granted') {
    return (
      <CameraContainer
        header={
          <CameraHeader
            title="Camera Permission"
            onMenuPress={onNavigateBack}
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

  // Main camera recording screen
  return (
    <CameraContainer
      header={
        <CameraHeader
          title="Solo:Level"
          showTimer={recordingState !== RecordingState.IDLE}
          timerValue={formatDuration(recordingDuration)}
          onMenuPress={onOpenSideSheet}
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
      <CameraPreviewArea isRecording={recordingState === RecordingState.RECORDING}>
        <CameraPreview
          isRecording={recordingState === RecordingState.RECORDING}
          cameraType={cameraType}
          onCameraReady={handleCameraReady}
          onError={handleCameraError}
        >
          {/* Phase 2: Recording controls will be added here */}
          <YStack
            position="absolute"
            bottom={40}
            alignSelf="center"
            alignItems="center"
            gap="$4"
          >
            <Button
              circular
              size="$9"
              backgroundColor="red"
              onPress={() => console.log('Record button pressed')}
              scaleIcon={2}
              icon={<Circle color="white" />}
              aria-label="Record Video"
            />
            {/* Placeholder for camera swap button */}
            <Button
              circular
              size="$5"
              backgroundColor="rgba(0,0,0,0.5)"
              onPress={() => console.log('Camera swap button pressed')}
              scaleIcon={1.5}
              icon={<SwitchCamera color="white" />}
              aria-label="Swap Camera"
            />
          </YStack>
        </CameraPreview>
      </CameraPreviewArea>
    </CameraContainer>
  )
}

// Helper function
function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
