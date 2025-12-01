import { log } from '@my/logging'
import { Pause, Play, Square, SwitchCamera } from '@tamagui/lucide-icons'
import { Text, XStack, YStack } from 'tamagui'
import { GlassButton } from '../../GlassButton'

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
  canStop?: boolean
  formattedDuration?: string

  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
  onCameraSwap?: () => void
  onZoomChange?: (level: 1 | 2 | 3) => void

  disabled?: boolean
}

/**
 * Recording State Camera Controls
 * Pause/Stop controls, zoom levels, camera settings, and swap
 * Implements US-RU-06b: Recording states — Recording/Paused controls
 */
export function RecordingControls({
  recordingState,
  //duration,
  zoomLevel: _zoomLevel,
  canSwapCamera,
  canStop = false,
  //formattedDuration,
  onPause,
  onResume,
  onStop,
  onCameraSwap,
  onZoomChange: _onZoomChange,
  disabled = false,
}: RecordingControlsProps) {
  // const formatTime = (milliseconds: number): string => {
  //   if (formattedDuration) return formattedDuration

  //   const totalSeconds = Math.floor(milliseconds / 1000)
  //   const minutes = Math.floor(totalSeconds / 60)
  //   const seconds = totalSeconds % 60
  //   return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  // }

  const handlePauseResume = () => {
    if (recordingState === RecordingState.RECORDING) {
      onPause?.()
    } else if (recordingState === RecordingState.PAUSED) {
      onResume?.()
    }
  }

  const isPaused = recordingState === RecordingState.PAUSED
  //const isRecording = recordingState === RecordingState.RECORDING

  return (
    <YStack
      alignItems="center"
      gap="$4"
      testID="recording-controls"
      elevation={1}
    >
      {/* Main Control Row - Matching IdleControls layout exactly */}
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$8"
        paddingHorizontal="$3"
      >
        {/* Pause/Resume Button - Left side (where upload button is in idle) */}
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          overflow="visible"
        >
          <GlassButton
            onPress={handlePauseResume}
            disabled={disabled}
            width={56}
            minWidth={56}
            minHeight={56}
            borderRadius={28}
            icon={
              isPaused ? (
                <Play
                  size="$2"
                  color={disabled ? 'rgba(255,255,255,0.5)' : 'white'}
                  fill={disabled ? 'rgba(255,255,255,0.5)' : 'white'}
                />
              ) : (
                <Pause
                  size="$2"
                  color={disabled ? 'rgba(255,255,255,0.5)' : 'white'}
                  fill={disabled ? 'rgba(255,255,255,0.5)' : 'white'}
                />
              )
            }
            accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
            accessibilityHint={
              isPaused ? 'Resume the current recording' : 'Pause the current recording'
            }
          />
        </YStack>

        {/* Stop Button - Center (same position and size as record button in idle) */}
        <YStack
          width={72}
          height={72}
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          <GlassButton
            onPress={onStop}
            disabled={disabled || !canStop}
            testID="stop-button"
            width={72}
            minWidth={72}
            minHeight={72}
            borderRadius={36}
            borderWidth={2}
            borderColor="rgba(255,255,255,0.65)"
            accessibilityLabel="Stop recording"
            accessibilityHint="Stop the current recording"
          >
            <Square
              size="$2"
              color={!canStop ? 'rgba(255,255,255,0.5)' : 'red'}
              fill={!canStop ? 'rgba(255,255,255,0.5)' : 'red'}
            />
          </GlassButton>
        </YStack>

        {/* Camera Swap Button - Right side (same position as in idle) */}
        <GlassButton
          onPress={async () => {
            try {
              await onCameraSwap?.()
            } catch (error) {
              // Error is handled in the camera logic, just log for debugging
              log.warn('RecordingControls', 'Camera swap failed', {
                error: error instanceof Error ? error.message : String(error),
              })
            }
          }}
          disabled={disabled || !canSwapCamera}
          icon={
            <SwitchCamera
              size="$1"
              color={!canSwapCamera ? 'rgba(255, 255, 255, 0.3)' : 'white'}
            />
          }
          opacity={!canSwapCamera ? 0.3 : 1}
          accessibilityLabel="Switch camera"
          accessibilityHint="Switch between front and back camera"
        />
      </XStack>
    </YStack>
  )
}

export interface RecordingControlsWithZoomProps extends RecordingControlsProps {
  /** Bottom inset for safe area (unused - kept for API compatibility) */
  bottomInset?: number
}

/**
 * Recording Controls with Zoom at Bottom
 * Renders main controls and zoom controls positioned at the bottom of the screen
 * Uses fixed offset (-60px) to position zoom controls below the overlay container
 * The CameraControlsOverlay is at bottom: 80px, so zoom ends up at ~20px from screen bottom
 */
export function RecordingControlsWithZoom({
  bottomInset: _bottomInset = 0,
  ...props
}: RecordingControlsWithZoomProps) {
  return (
    <YStack
      flex={1}
      position="relative"
    >
      {/* Main controls at top of this container */}
      <RecordingControls {...props} />

      {/* Zoom controls at fixed position below overlay (bottom: 80 - 60 = 20px from screen) */}
      <YStack
        position="absolute"
        bottom={-60}
        left={0}
        right={0}
        alignItems="center"
      >
        <ZoomControls
          currentZoom={props.zoomLevel}
          onZoomChange={props.onZoomChange}
          disabled={props.disabled}
        />
      </YStack>
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

  const handleZoomChange = (level: 1 | 2 | 3) => {
    onZoomChange?.(level)
  }

  return (
    <XStack
      alignItems="center"
      gap="$2"
      backgroundColor="rgba(0,0,0,0.2)"
      borderRadius="$4"
      padding="$2"
    >
      {zoomLevels.map((level) => (
        <ZoomButton
          key={level}
          level={level}
          isActive={currentZoom === level}
          onPress={() => handleZoomChange(level)}
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
  const handlePress = () => {
    onPress?.()
  }

  return (
    <GlassButton
      onPress={handlePress}
      disabled={disabled}
      backgroundColor={disabled ? '$color8' : isActive ? '$blue9' : 'rgba(255,255,255,0.05)'}
      minHeight={32}
      minWidth={36}
      blurIntensity={isActive ? 30 : 20}
      blurTint={isActive ? 'dark' : 'light'}
      accessibilityLabel={`${level}x zoom`}
      // biome-ignore lint/a11y/useSemanticElements: GlassButton is a styled button component
      role="button"
      accessibilityState={{ checked: isActive }}
      accessibilityHint={isActive ? 'Currently selected' : undefined}
    >
      <Text
        fontSize="$3"
        fontWeight="600"
        color={disabled ? '$color11' : 'white'}
      >
        {level}x
      </Text>
    </GlassButton>
  )
}
