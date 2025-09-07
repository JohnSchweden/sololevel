import { Settings, Square, SwitchCamera } from '@tamagui/lucide-icons'
import { useState } from 'react'
// Use React Native Pressable with platform detection
import { Platform, Pressable } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { Button } from 'tamagui'
import { shadows } from '@my/config'
import { log } from '../../utils/logger'

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

export interface RecordingControlsProps {
  recordingState: RecordingState
  duration: number
  zoomLevel: 1 | 2 | 3
  canSwapCamera: boolean
  formattedDuration?: string

  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
  onCameraSwap?: () => void
  onZoomChange?: (level: 1 | 2 | 3) => void
  onSettingsOpen?: () => void

  disabled?: boolean
}

/**
 * Recording State Camera Controls
 * Pause/Stop controls, zoom levels, camera settings, and swap
 * Implements US-RU-06b: Recording states — Recording/Paused controls
 */
export function RecordingControls({
  recordingState,
  duration,
  zoomLevel,
  canSwapCamera,
  formattedDuration,
  onPause,
  onResume,
  onStop,
  onCameraSwap,
  onZoomChange,
  onSettingsOpen,
  disabled = false,
}: RecordingControlsProps) {
  const [isPausePressed, setIsPausePressed] = useState(false)

  const formatTime = (milliseconds: number): string => {
    if (formattedDuration) return formattedDuration

    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePauseResume = () => {
    if (recordingState === RecordingState.RECORDING) {
      onPause?.()
    } else if (recordingState === RecordingState.PAUSED) {
      onResume?.()
    }
  }

  const isPaused = recordingState === RecordingState.PAUSED
  const isRecording = recordingState === RecordingState.RECORDING

  return (
    <YStack
      alignItems="center"
      gap="$4"
    >
      {/* Recording Timer */}
      <YStack
        backgroundColor="rgba(0,0,0,0.6)"
        paddingHorizontal="$4"
        paddingVertical="$2"
        borderRadius="$6"
      >
        <Text
          fontSize="$6"
          fontFamily="$body"
          fontWeight="600"
          color={isRecording ? '$color10' : '$color10'}
          textAlign="center"
          accessibilityRole="text"
          accessibilityLabel={`Recording time: ${formatTime(duration)}`}
        >
          {formatTime(duration)}
        </Text>
      </YStack>

      {/* Primary Control Row - Pause/Resume and Stop */}
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$6"
        paddingHorizontal="$4"
      >
        {/* Pause/Resume Button */}
        <Pressable
          onPress={handlePauseResume}
          onPressIn={() => setIsPausePressed(true)}
          onPressOut={() => setIsPausePressed(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
          accessibilityHint={
            isPaused ? 'Resume the current recording' : 'Pause the current recording'
          }
        >
          <XStack
            alignItems="center"
            justifyContent="center"
            backgroundColor={disabled ? '$color8' : 'rgba(255,255,255,0.9)'}
            borderRadius="$8"
            paddingHorizontal="$4"
            paddingVertical="$3"
            minHeight={60}
            minWidth={120}
            gap="$2"
            {...shadows.medium}
            // Touch feedback
            scale={isPausePressed ? 0.95 : 1.0}
            animation="quick"
            hoverStyle={{
              backgroundColor: disabled ? '$color8' : 'rgba(255,255,255,1.0)',
            }}
          >
            {isPaused ? (
              <YStack
                width={0}
                height={0}
                borderLeftWidth={12}
                borderLeftColor={disabled ? '$color10' : '$color10'}
                borderTopWidth={8}
                borderTopColor="transparent"
                borderBottomWidth={8}
                borderBottomColor="transparent"
                marginLeft="$1"
              />
            ) : (
              <>
                <YStack
                  width={4}
                  height={16}
                  backgroundColor={disabled ? '$color10' : '$color10'}
                  borderRadius="$1"
                />
                <YStack
                  width={4}
                  height={16}
                  backgroundColor={disabled ? '$color10' : '$color10'}
                  borderRadius="$1"
                />
              </>
            )}
          </XStack>
        </Pressable>

        {/* Stop Button */}
        <Button
          onPress={onStop}
          disabled={disabled}
          backgroundColor="transparent" // Transparent
          borderRadius="$8"
          minHeight={60}
          minWidth={60}
          pressStyle={{
            scale: 0.95,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          accessibilityHint="Stop the current recording"
          icon={
            <Square
              size="$2"
              color="red" // Red
              fill="red" // Red
            />
          }
        />
      </XStack>

      {/* Secondary Control Row - Settings, Zoom, Camera Swap */}
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$4"
        paddingHorizontal="$4"
      >
        {/* Camera Settings Button */}
        <Button
          variant="outlined"
          size="$3"
          onPress={onSettingsOpen}
          disabled={disabled}
          icon={
            <Settings
              size="$1.5"
              color="white"
            />
          }
          backgroundColor="rgba(255,255,255,0.2)"
          borderRadius="$8"
          minHeight={44}
          minWidth={44}
          pressStyle={{
            scale: 0.95,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Camera settings"
        />

        {/* Zoom Controls */}
        <ZoomControls
          currentZoom={zoomLevel}
          onZoomChange={onZoomChange}
          disabled={disabled}
        />

        {/* Camera Swap Button */}
        <Button
          variant="outlined"
          size="$3"
          onPress={async () => {
            try {
              await onCameraSwap?.()
            } catch (error) {
              // Error is handled in the camera logic, just log for debugging
              log.warn('RecordingControls', 'Camera swap failed', error)
            }
          }}
          disabled={disabled || !canSwapCamera}
          icon={
            <SwitchCamera
              size="$1.5"
              color="white"
            />
          }
          backgroundColor="rgba(255,255,255,0.2)"
          borderRadius="$8"
          minHeight={44}
          minWidth={44}
          pressStyle={{
            scale: 0.95,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
          opacity={!canSwapCamera ? 0.5 : 1}
        />
      </XStack>
    </YStack>
  )
}

export interface ZoomControlsProps {
  currentZoom: 1 | 2 | 3
  onZoomChange?: (level: 1 | 2 | 3) => void
  disabled?: boolean
}

/**
 * Zoom Level Controls Component
 * Discrete zoom levels (1x, 2x, 3x) with visual feedback
 * Implements US-RU-09b: Camera controls — zoom during recording
 */
export function ZoomControls({ currentZoom, onZoomChange, disabled = false }: ZoomControlsProps) {
  const zoomLevels: Array<1 | 2 | 3> = [1, 2, 3]

  return (
    <XStack
      alignItems="center"
      gap="$2"
      backgroundColor="rgba(0,0,0,0.4)"
      borderRadius="$6"
      padding="$2"
    >
      {zoomLevels.map((level) => (
        <ZoomButton
          key={level}
          level={level}
          isActive={currentZoom === level}
          onPress={() => onZoomChange?.(level)}
          disabled={disabled}
        />
      ))}
    </XStack>
  )
}

interface ZoomButtonProps {
  level: 1 | 2 | 3
  isActive: boolean
  onPress?: () => void
  disabled?: boolean
}

function ZoomButton({ level, isActive, onPress, disabled }: ZoomButtonProps) {
  return (
    <Button
      variant="outlined"
      size="$2"
      onPress={onPress}
      disabled={disabled}
      backgroundColor={disabled ? '$color8' : isActive ? '$blue9' : 'rgba(255,255,255,0.2)'}
      borderRadius="$4"
      minHeight={32}
      minWidth={36}
      paddingHorizontal="$2"
      pressStyle={{
        scale: 0.95,
        backgroundColor: isActive ? '$blue10' : 'rgba(255,255,255,0.3)',
      }}
      hoverStyle={{
        backgroundColor: isActive ? '$blue10' : 'rgba(255,255,255,0.25)',
      }}
      accessibilityRole="button"
      {...(Platform.OS === 'web'
        ? { 'aria-label': `${level}x zoom`, 'aria-pressed': isActive }
        : { accessibilityLabel: `${level}x zoom`, accessibilityState: { selected: isActive } })}
    >
      <Text
        fontSize="$3"
        fontWeight="600"
        color={disabled ? '$color11' : isActive ? 'white' : 'white'}
      >
        {level}x
      </Text>
    </Button>
  )
}
