import { Pause, Play, RotateCcw, SkipBack, SkipForward } from '@tamagui/lucide-icons'
import React from 'react'
import { XStack } from 'tamagui'
import { GlassButton } from '../../../GlassButton'
import { formatTime } from './TimeDisplay'

export interface CenterControlsProps {
  /** Whether video is currently playing */
  isPlaying: boolean
  /** Whether video has ended */
  videoEnded: boolean
  /** Whether video is being processed */
  isProcessing: boolean
  /** Current playback time in seconds */
  currentTime: number
  /** Callback when play button is pressed */
  onPlay: () => void
  /** Callback when pause button is pressed */
  onPause: () => void
  /** Callback when replay button is pressed */
  onReplay?: () => void
  /** Callback when skip backward is pressed */
  onSkipBackward: () => void
  /** Callback when skip forward is pressed */
  onSkipForward: () => void
}

/**
 * Center playback controls for video player
 *
 * Displays play/pause, skip backward/forward buttons
 * Absolutely positioned in vertical center of screen
 */
export const CenterControls = React.memo<CenterControlsProps>(
  ({
    isPlaying,
    videoEnded,
    isProcessing,
    currentTime,
    onPlay,
    onPause,
    onReplay,
    onSkipBackward,
    onSkipForward,
  }) => {
    return (
      <XStack
        position="absolute"
        left={0}
        right={0}
        top={0}
        bottom={0}
        justifyContent="center"
        alignItems="center"
        gap="$8"
        accessibilityLabel="Video playback controls"
        opacity={isProcessing ? 0 : 1}
        pointerEvents={isProcessing ? 'none' : 'auto'}
      >
        <GlassButton
          icon={
            <SkipBack
              size={24}
              color="$color"
            />
          }
          minWidth={40}
          minHeight={40}
          blurTint="dark"
          blurIntensity={15}
          borderWidth={0}
          edgeGlowIntensity={0.3}
          animation={undefined}
          onPress={onSkipBackward}
          testID="rewind-button"
          accessibilityLabel="Rewind 10 seconds"
          accessibilityHint={`Skip backward 10 seconds from ${formatTime(currentTime)}`}
        />
        <GlassButton
          icon={
            videoEnded ? (
              <RotateCcw
                size={35}
                color="$color"
              />
            ) : isPlaying ? (
              <Pause
                size={35}
                color="$color"
              />
            ) : (
              <Play
                size={35}
                color="$color"
              />
            )
          }
          minWidth={54}
          minHeight={54}
          blurTint="dark"
          blurIntensity={15}
          overlayOpacity={0.5}
          borderWidth={0}
          edgeGlowIntensity={0.3}
          animation={undefined}
          onPress={() => {
            if (videoEnded && onReplay) {
              onReplay()
            } else {
              isPlaying ? onPause() : onPlay()
            }
          }}
          testID={videoEnded ? 'replay-button' : isPlaying ? 'pause-button' : 'play-button'}
          accessibilityLabel={
            videoEnded ? 'Replay video' : isPlaying ? 'Pause video' : 'Play video'
          }
          accessibilityHint={
            videoEnded
              ? 'Restart video from beginning'
              : isPlaying
                ? 'Pause video playback'
                : 'Start video playback'
          }
        />
        <GlassButton
          icon={
            <SkipForward
              size={24}
              color="$color"
            />
          }
          minWidth={40}
          minHeight={40}
          blurTint="dark"
          blurIntensity={15}
          borderWidth={0}
          edgeGlowIntensity={0.3}
          animation={undefined}
          onPress={onSkipForward}
          testID="fast-forward-button"
          accessibilityLabel="Fast forward 10 seconds"
          accessibilityHint={`Skip forward 10 seconds from ${formatTime(currentTime)}`}
        />
      </XStack>
    )
  }
)

CenterControls.displayName = 'CenterControls'
