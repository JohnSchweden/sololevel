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
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

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
    >
      {/* Center Controls */}
      <XStack
        justifyContent="center"
        alignItems="center"
        gap="$4"
        marginBottom="$4"
      >
        <Button
          chromeless
          icon={SkipBack}
          size={60}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={30}
          onPress={() => onSeek(Math.max(0, currentTime - 10))}
          testID="rewind-button"
        />
        <Button
          chromeless
          icon={isPlaying ? Pause : Play}
          size={80}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={40}
          onPress={isPlaying ? onPause : onPlay}
          testID={isPlaying ? 'pause-button' : 'play-button'}
        />
        <Button
          chromeless
          icon={SkipForward}
          size={60}
          backgroundColor="rgba(0,0,0,0.6)"
          borderRadius={30}
          onPress={() => onSeek(Math.min(duration, currentTime + 10))}
          testID="fast-forward-button"
        />
      </XStack>

      {/* Bottom Controls */}
      <YStack gap="$2">
        {/* Time Display */}
        <XStack justifyContent="space-between">
          <Text
            fontSize="$3"
            color="$color12"
            testID="current-time"
          >
            {formatTime(currentTime)}
          </Text>
          <Text
            fontSize="$3"
            color="$color12"
            testID="total-time"
          >
            {formatTime(duration)}
          </Text>
        </XStack>

        {/* Progress Bar */}
        <YStack
          height={4}
          backgroundColor="$color3"
          borderRadius={2}
        >
          <YStack
            height="100%"
            width={`${progress}%`}
            backgroundColor="$yellow9"
            borderRadius={2}
            testID="progress-fill"
          />
        </YStack>

        {/* Fullscreen Button */}
        <XStack justifyContent="flex-end">
          <Button
            chromeless
            icon={Maximize}
            size={44}
            color="$color12"
            testID="fullscreen-button"
          />
        </XStack>
      </YStack>
    </YStack>
  )
}
