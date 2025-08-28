import React, { useState } from 'react'
import { XStack, YStack, Circle } from 'tamagui'
import { Button } from 'tamagui'
import { Upload, SwitchCamera } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'

export interface IdleControlsProps {
  onStartRecording?: () => void
  onUploadVideo?: () => void
  onCameraSwap?: () => void
  disabled?: boolean
  cameraSwapDisabled?: boolean
}

/**
 * Idle State Camera Controls
 * Primary record button (80x80px), upload button, and camera swap
 * Implements US-RU-06a: Recording states — Idle controls
 */
export function IdleControls({
  onStartRecording,
  onUploadVideo,
  onCameraSwap,
  disabled = false,
  cameraSwapDisabled = false,
}: IdleControlsProps) {
  const [isRecordPressed, setIsRecordPressed] = useState(false)

  return (
    <YStack
      alignItems="center"
      gap="$4"
    >
      {/* Main Control Row */}
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$6"
        paddingHorizontal="$3"
      >
        {/* Upload Video Button */}
        <Button
          variant="outlined"
          size="$3"
          onPress={onUploadVideo}
          disabled={disabled}
          icon={
            <Upload
              size="$1.5"
              color="white"
            />
          }
          backgroundColor="$overlayGlassStrong"
          borderRadius="$12"
          minHeight={56}
          minWidth={56}
          pressStyle={{
            scale: 0.96,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Upload video file"
          accessibilityHint="Select an existing video to upload for analysis"
        />

        {/* Primary Record Button */}
        <Pressable
          onPress={onStartRecording}
          onPressIn={() => setIsRecordPressed(true)}
          onPressOut={() => setIsRecordPressed(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Start recording"
          accessibilityHint="Press to start recording a new video"
        >
          <YStack
            alignItems="center"
            justifyContent="center"
            width={88}
            height={88}
            backgroundColor="transparent"
            borderRadius="$12"
            borderWidth={2}
            borderColor="rgba(255,255,255,0.95)"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.15}
            shadowRadius={4}
            elevation={4}
            scale={isRecordPressed ? 0.97 : 1.0}
            animation="quick"
            hoverStyle={{
              scale: 1.02,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
            pressStyle={{
              scale: 0.97,
            }}
          >
            {/* Inner Record Circle */}
            <Circle
              size={56}
              backgroundColor="$orange10"
              opacity={disabled ? 0.5 : 1.0}
            />
          </YStack>
        </Pressable>

        {/* Camera Swap Button */}
        <Button
          variant="outlined"
          size="$3"
          onPress={onCameraSwap}
          disabled={disabled || cameraSwapDisabled}
          icon={
            <SwitchCamera
              size="$1.5"
              color="white"
            />
          }
          backgroundColor="$overlayGlassStrong"
          borderRadius="$12"
          minHeight={56}
          minWidth={56}
          pressStyle={{
            scale: 0.96,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          accessibilityHint="Switch between front and back camera"
        />
      </XStack>
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
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={variant === 'primary' ? 0.3 : 0.1}
        shadowRadius={8}
        elevation={variant === 'primary' ? 8 : 4}
        // Touch feedback
        scale={isPressed ? 0.95 : 1.0}
        animation="quick"
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
