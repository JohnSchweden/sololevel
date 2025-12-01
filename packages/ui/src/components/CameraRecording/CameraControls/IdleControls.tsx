import { MAX_RECORDING_DURATION_SECONDS } from '@app/features/CameraRecording/config/recordingConfig'
import { shadows } from '@my/config'
import { log } from '@my/logging'
import { SwitchCamera, Upload } from '@tamagui/lucide-icons'
import React, { useCallback, useState } from 'react'
// Use React Native Pressable with platform detection
import { Pressable } from 'react-native'
import { Button, Circle, XStack, YStack } from 'tamagui'
import type { VideoValidationResult } from '../../../utils/videoValidation'
import { GlassButton } from '../../GlassButton'
import { VideoFilePicker } from '../../VideoFilePicker/VideoFilePicker'

export interface IdleControlsProps {
  onStartRecording?: () => void
  onUploadVideo?: () => void
  onVideoSelected?: (file: File, metadata: VideoValidationResult['metadata']) => void
  onCameraSwap?: () => void
  disabled?: boolean
  cameraSwapDisabled?: boolean
  maxDurationSeconds?: number
  maxFileSizeBytes?: number
  showUploadProgress?: boolean
  uploadProgress?: number
  // Camera swap visual feedback
  isCameraSwapping?: boolean
  cameraSwapTransitionDuration?: number
  // Test IDs for Detox testing
  testID?: string
  recordButtonTestID?: string
  uploadButtonTestID?: string
  cameraSwapButtonTestID?: string
}

/**
 * Idle State Camera Controls
 * Primary record button (80x80px), upload button, and camera swap
 * Implements US-RU-06a: Recording states — Idle controls
 */
export function IdleControls({
  onStartRecording,
  onUploadVideo,
  onVideoSelected,
  onCameraSwap,
  disabled = false,
  cameraSwapDisabled = false,
  maxDurationSeconds = MAX_RECORDING_DURATION_SECONDS,
  maxFileSizeBytes = 100 * 1024 * 1024, // 100MB
  showUploadProgress = false,
  uploadProgress = 0,
  isCameraSwapping = false,
  cameraSwapTransitionDuration = 300, // Used for accessibility and future animation timing
  testID,
  recordButtonTestID = 'record-button',
  uploadButtonTestID = 'upload-button',
  cameraSwapButtonTestID = 'camera-swap-button',
}: IdleControlsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  // Timing refs for performance tracking
  const handleUploadVideo = useCallback(() => {
    if (onVideoSelected) {
      // Use integrated video picker
      setIsPickerOpen(true)
    } else if (onUploadVideo) {
      // Use legacy callback
      onUploadVideo()
    }
  }, [onVideoSelected, onUploadVideo])

  const handleVideoSelected = useCallback(
    (file: File, metadata: VideoValidationResult['metadata']) => {
      setIsPickerOpen(false)
      onVideoSelected?.(file, metadata)
    },
    [onVideoSelected]
  )

  const handlePickerCancel = useCallback(() => {
    setIsPickerOpen(false)
  }, [])

  // Choose the appropriate picker based on platform
  const VideoPickerComponent = VideoFilePicker

  return (
    <YStack
      alignItems="center"
      gap="$4"
      testID={testID}
      elevation={1}
    >
      {/* Main Control Row */}
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$8"
        paddingHorizontal="$3"
      >
        {/* Upload Video Button */}
        <GlassButton
          onPress={handleUploadVideo}
          disabled={disabled || showUploadProgress}
          testID={uploadButtonTestID}
          icon={
            <Upload
              size="$1"
              color="$color"
            />
          }
          accessibilityLabel="Upload video file"
          accessibilityHint="Select an existing video to upload for analysis"
        />

        {/* Primary Record Button */}
        <YStack
          width={72}
          height={72}
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          <GlassButton
            onPress={onStartRecording}
            disabled={disabled}
            testID={recordButtonTestID}
            width={72}
            minWidth={72}
            minHeight={72}
            borderRadius={36}
            borderWidth={2}
            borderColor="rgba(255, 255, 255, 0.65)"
            accessibilityLabel="Start recording"
            accessibilityHint="Press to start recording a new video"
          >
            <Circle
              size={56}
              backgroundColor="$orange10"
              opacity={disabled ? 0.5 : 1.0}
            />
          </GlassButton>
        </YStack>

        {/* Camera Swap Button */}
        <YStack
          style={{
            transitionDuration: `${cameraSwapTransitionDuration}ms`,
          }}
        >
          <GlassButton
            onPress={async () => {
              try {
                await onCameraSwap?.()
              } catch (error) {
                // Error is handled in the camera logic, just log for debugging
                log.warn('IdleControls', 'Camera swap failed', {
                  error: error instanceof Error ? error.message : String(error),
                })
              }
            }}
            disabled={disabled || cameraSwapDisabled || isCameraSwapping}
            testID={cameraSwapButtonTestID}
            icon={
              <SwitchCamera
                size="$1"
                color={isCameraSwapping ? 'rgba(255,255,255,0.6)' : 'white'}
              />
            }
            opacity={isCameraSwapping ? 0.7 : 1.0}
            accessibilityLabel={isCameraSwapping ? 'Switching camera' : 'Switch camera'}
            accessibilityHint="Switch between front and back camera"
          />
        </YStack>
      </XStack>

      {/* Integrated Video File Picker */}
      {onVideoSelected && (
        <VideoPickerComponent
          isOpen={isPickerOpen}
          onVideoSelected={handleVideoSelected}
          onCancel={handlePickerCancel}
          maxDurationSeconds={maxDurationSeconds}
          maxFileSizeBytes={maxFileSizeBytes}
          showUploadProgress={showUploadProgress}
          uploadProgress={uploadProgress}
          disabled={showUploadProgress}
        />
      )}
    </YStack>
  )
}

export interface RecordButtonProps {
  onPress?: () => void
  disabled?: boolean
  size?: number
  variant?: 'primary' | 'secondary'
}

/**
 * Standalone Record Button Component
 * Can be used independently or within IdleControls
 */
export function RecordButton({
  onPress,
  disabled = false,
  size = 80,
  variant = 'primary',
}: RecordButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const buttonSize = size + 10
  const innerCircleSize = Math.floor(buttonSize * 0.35)

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Record video"
      accessibilityHint="Press to start recording"
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        width={buttonSize}
        height={buttonSize}
        backgroundColor={
          disabled ? '$color8' : variant === 'primary' ? '$color9' : 'rgba(255,255,255,0.9)'
        }
        borderRadius="$12"
        borderWidth={variant === 'primary' ? 4 : 2}
        borderColor={variant === 'primary' ? 'rgba(255,255,255,0.3)' : '$borderColor'}
        {...(variant === 'primary' ? shadows.large : shadows.medium)}
        // Touch feedback
        scale={isPressed ? 0.95 : 1.0}
      >
        <Circle
          size={innerCircleSize}
          backgroundColor={
            variant === 'primary'
              ? disabled
                ? 'rgba(255,255,255,0.5)'
                : 'white'
              : disabled
                ? '$color10'
                : '$color9'
          }
        />
      </YStack>
    </Pressable>
  )
}

export interface ControlButtonProps {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'chromeless'
  size?: 'small' | 'medium' | 'large'
}

/**
 * Generic Control Button for Camera UI
 * Consistent styling for camera control buttons
 */
export function ControlButton({
  icon,
  label,
  onPress,
  disabled = false,
  variant = 'chromeless',
  size = 'medium',
}: ControlButtonProps) {
  const sizeConfig = {
    small: { minHeight: 44, minWidth: 44, iconSize: '$1.5', fontSize: '$2' },
    medium: { minHeight: 60, minWidth: 60, iconSize: '$2', fontSize: '$3' },
    large: { minHeight: 80, minWidth: 80, iconSize: '$2.5', fontSize: '$4' },
  }

  const config = sizeConfig[size]

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return disabled ? '$color8' : '$color9'
      case 'secondary':
        return disabled ? '$color6' : '$background'
      default:
        return disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
    }
  }

  return (
    <Button
      variant={variant as any}
      onPress={onPress}
      disabled={disabled}
      backgroundColor={getBackgroundColor()}
      borderRadius="$12"
      minHeight={config.minHeight}
      minWidth={config.minWidth}
      animation="quick"
      pressStyle={{
        scale: 0.95,
        backgroundColor: variant === 'chromeless' ? 'rgba(255,255,255,0.3)' : undefined,
      }}
      hoverStyle={{
        backgroundColor: variant === 'chromeless' ? 'rgba(255,255,255,0.25)' : undefined,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack
        alignItems="center"
        gap="$1"
      >
        {icon}
      </YStack>
    </Button>
  )
}
