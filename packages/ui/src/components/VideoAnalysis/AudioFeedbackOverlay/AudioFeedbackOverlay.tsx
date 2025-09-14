import { Pause, Play, X } from '@tamagui/lucide-icons'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface AudioFeedbackOverlayProps {
  audioUrl: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onClose: () => void
  isVisible: boolean
}

export function AudioFeedbackOverlay({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onClose,
  isVisible,
}: Pick<
  AudioFeedbackOverlayProps,
  'audioUrl' | 'isPlaying' | 'currentTime' | 'duration' | 'onPlayPause' | 'onClose' | 'isVisible'
>) {
  if (!isVisible || !audioUrl) {
    return null
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <YStack
      position="absolute"
      bottom={100}
      left="$4"
      right="$4"
      testID="audio-feedback-overlay"
    >
      <YStack
        backgroundColor="rgba(0,0,0,0.8)"
        borderRadius="$4"
        padding="$3"
        testID="audio-controls"
      >
        <XStack
          alignItems="center"
          gap="$3"
        >
          <Button
            size={44}
            icon={isPlaying ? Pause : Play}
            backgroundColor="$primary"
            borderRadius="$2"
            onPress={onPlayPause}
            testID="audio-play-pause-button"
          />

          <YStack
            flex={1}
            height={4}
            backgroundColor="$gray6"
            borderRadius="$1"
          >
            <YStack
              height="100%"
              width={`${progress}%`}
              backgroundColor="$primary"
              borderRadius="$1"
              testID="audio-progress-fill"
            />
          </YStack>

          <Text
            fontSize="$2"
            color="$white"
            minWidth={40}
            testID="audio-time"
          >
            {formatTime(currentTime)}
          </Text>

          <Button
            size={32}
            icon={X}
            color="$white"
            chromeless
            onPress={onClose}
            testID="audio-close-button"
          />
        </XStack>

        {/* Optional waveform visualization */}
        <YStack
          height={20}
          backgroundColor="rgba(255,255,255,0.1)"
          borderRadius="$2"
          marginTop="$2"
          justifyContent="center"
          alignItems="center"
          testID="audio-waveform"
        >
          <Text
            fontSize="$1"
            color="$gray11"
            opacity={0.7}
          >
            Audio Waveform
          </Text>
        </YStack>
      </YStack>
    </YStack>
  )
}
