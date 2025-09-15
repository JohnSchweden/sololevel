import { Maximize, Pause, Play, SkipBack, SkipForward } from '@tamagui/lucide-icons'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface VideoControlsOverlayProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  showControls: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
}

export function VideoControlsOverlay({
  isPlaying,
  currentTime,
  duration,
  showControls,
  onPlay,
  onPause,
  onSeek,
}: VideoControlsOverlayProps) {
  const formatTime = (seconds: number) => {
    // Handle negative values by treating them as 0
    const safeSeconds = Math.max(0, seconds)

    if (safeSeconds >= 3600) {
      const hours = Math.floor(safeSeconds / 3600)
      const minutes = Math.floor((safeSeconds % 3600) / 60)
      const remainingSeconds = Math.floor(safeSeconds % 60)
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    const minutes = Math.floor(safeSeconds / 60)
    const remainingSeconds = Math.floor(safeSeconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const progressPercentage = Math.round(progress)

  return (
    <YStack
      position="absolute"
      inset={0}
      backgroundColor="rgba(0,0,0,0.3)"
      justifyContent="flex-end"
      padding="$4"
      opacity={showControls ? 1 : 0}
      pointerEvents={showControls ? 'auto' : 'none'}
      testID="video-controls-overlay"
      accessibilityLabel={`Video controls overlay ${showControls ? 'visible' : 'hidden'}`}
      accessibilityRole="toolbar"
      accessibilityState={{ expanded: showControls }}
    >
      {/* Center Controls */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$4"
        marginBottom="$4"
        accessibilityLabel="Video playback controls"
      >
        <Button
          chromeless
          icon={SkipBack}
          size={60}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={30}
          onPress={() => onSeek(Math.max(0, currentTime - 10))}
          testID="rewind-button"
          accessibilityLabel="Rewind 10 seconds"
          accessibilityRole="button"
          accessibilityHint={`Skip backward 10 seconds from ${formatTime(currentTime)}`}
        />
        <Button
          chromeless
          icon={isPlaying ? Pause : Play}
          size={80}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={40}
          onPress={isPlaying ? onPause : onPlay}
          testID={isPlaying ? 'pause-button' : 'play-button'}
          accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
          accessibilityRole="button"
          accessibilityHint={isPlaying ? 'Pause video playback' : 'Start video playback'}
          accessibilityState={{ selected: isPlaying }}
        />
        <Button
          chromeless
          icon={SkipForward}
          size={60}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={30}
          onPress={() => onSeek(Math.min(duration, currentTime + 10))}
          testID="fast-forward-button"
          accessibilityLabel="Fast forward 10 seconds"
          accessibilityRole="button"
          accessibilityHint={`Skip forward 10 seconds from ${formatTime(currentTime)}`}
        />
      </XStack>

      {/* Bottom Controls */}
      <YStack
        gap="$2"
        accessibilityLabel="Video timeline and controls"
      >
        {/* Time Display */}
        <XStack
          justifyContent="space-between"
          accessibilityLabel="Video time information"
        >
          <Text
            fontSize="$3"
            color="$color12"
            testID="current-time"
            accessibilityLabel={`Current time: ${formatTime(currentTime)}`}
          >
            {formatTime(currentTime)}
          </Text>
          <Text
            fontSize="$3"
            color="$color12"
            testID="total-time"
            accessibilityLabel={`Total duration: ${formatTime(duration)}`}
          >
            {formatTime(duration)}
          </Text>
        </XStack>

        {/* Progress Bar */}
        <Button
          height={4}
          backgroundColor="$color3"
          borderRadius={2}
          testID="progress-bar"
          onPress={() => onSeek(Math.floor(duration * 0.5))} // Seek to middle of video
          accessibilityLabel={`Video progress: ${progressPercentage}% complete. Tap to seek to middle of video.`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPercentage }}
          accessibilityHint="Tap to jump to the middle of the video"
          chromeless
          padding={0}
        >
          <YStack
            height="100%"
            width={`${progress}%`}
            backgroundColor="$yellow9"
            borderRadius={2}
            testID="progress-fill"
          />
        </Button>

        {/* Fullscreen Button */}
        <XStack
          justifyContent="flex-end"
          accessibilityLabel="Additional video controls"
        >
          <Button
            chromeless
            icon={Maximize}
            size={44}
            color="$color12"
            testID="fullscreen-button"
            accessibilityLabel="Enter fullscreen mode"
            accessibilityRole="button"
            accessibilityHint="Tap to view video in fullscreen"
          />
        </XStack>
      </YStack>
    </YStack>
  )
}
