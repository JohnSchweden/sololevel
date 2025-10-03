import { Pause, Play, SkipBack, SkipForward, X } from '@tamagui/lucide-icons'
import { useCallback, useEffect, useRef } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface AudioFeedbackProps {
  audioUrl: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onClose: () => void
  isVisible: boolean
  onRewind?: () => void
  onFastForward?: () => void
  onTimeUpdate?: (time: number) => void
  autoHideDelay?: number
  showProgressBar?: boolean
}

export function AudioFeedback({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onClose,
  isVisible,
  onRewind,
  onFastForward,
  onTimeUpdate,
  autoHideDelay = 3000,
  showProgressBar = true,
}: AudioFeedbackProps) {
  const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())

  const resetAutoHideTimer = useCallback(() => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current)
    }
    lastInteractionRef.current = Date.now()
  }, [])

  const startAutoHideTimer = useCallback(() => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current)
    }
    autoHideTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastInteractionRef.current >= autoHideDelay) {
        onClose()
      }
    }, autoHideDelay)
  }, [autoHideDelay, onClose])

  useEffect(() => {
    if (isVisible && isPlaying) {
      startAutoHideTimer()
    } else {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }
  }, [isVisible, isPlaying, startAutoHideTimer])

  if (!isVisible || !audioUrl) {
    return null
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleRewind = () => {
    const newTime = Math.max(0, currentTime - 10)
    onSeek(newTime)
    onTimeUpdate?.(newTime)
    resetAutoHideTimer()
    onRewind?.()
  }

  const handleFastForward = () => {
    const newTime = Math.min(duration, currentTime + 10)
    onSeek(newTime)
    onTimeUpdate?.(newTime)
    resetAutoHideTimer()
    onFastForward?.()
  }

  const handlePlayPause = () => {
    onPlayPause()
    resetAutoHideTimer()
  }

  const handleClose = () => {
    onClose()
    resetAutoHideTimer()
  }

  return (
    <YStack
      position="absolute"
      bottom={100}
      width="50%"
      alignSelf="center"
      testID="audio-feedback-overlay"
    >
      <YStack
        backgroundColor="transparent"
        borderRadius="$4"
        padding="$1"
        testID="audio-controls"
      >
        {/* Main Controls */}
        <XStack
          alignItems="center"
          gap="$0.5"
          justifyContent="center"
        >
          <Button
            size={32}
            icon={SkipBack}
            color="$white"
            chromeless
            onPress={handleRewind}
            testID="audio-rewind-button"
          />

          <Button
            size={32}
            icon={isPlaying ? Pause : Play}
            backgroundColor="$primary"
            borderRadius="$2"
            onPress={handlePlayPause}
            testID="audio-play-pause-button"
          />

          <Button
            size={32}
            icon={SkipForward}
            color="$white"
            chromeless
            onPress={handleFastForward}
            testID="audio-fast-forward-button"
          />

          <Button
            size={32}
            icon={X}
            color="$white"
            chromeless
            onPress={handleClose}
            testID="audio-close-button"
          />
        </XStack>

        {/* Progress Bar */}
        {showProgressBar && (
          <YStack marginTop="$1">
            <YStack
              height={3}
              backgroundColor="$gray6"
              borderRadius="$1"
              testID="audio-progress-track"
              onPress={(event) => {
                // Simple click-to-seek implementation for React Native
                const { locationX } = event.nativeEvent
                // For React Native, we'll use a simpler approach with predefined seek points
                // In a real implementation, you might want to measure the component differently
                const estimatedWidth = 300 // Approximate width, could be passed as prop
                const percentage = locationX / estimatedWidth
                const newTime = Math.max(0, Math.min(duration, percentage * duration))
                onSeek(newTime)
                onTimeUpdate?.(newTime)
                resetAutoHideTimer()
              }}
            >
              <YStack
                height="100%"
                width={`${progress}%`}
                backgroundColor="$primary"
                borderRadius="$1"
                testID="audio-progress-fill"
              />
            </YStack>
          </YStack>
        )}

        {/* Time Display */}
        <XStack
          justifyContent="space-between"
          marginTop="$0.5"
        >
          <Text
            fontSize="$2"
            color="$white"
            testID="audio-current-time"
          >
            {formatTime(currentTime)}
          </Text>
          <Text
            fontSize="$2"
            color="$white"
            opacity={0.7}
            testID="audio-duration"
          >
            {formatTime(duration)}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  )
}
