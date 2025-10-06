import { AudioControllerState } from '@app/features/VideoAnalysis/hooks/useAudioController'
import { log } from '@my/logging'
import { Pause, Play, SkipBack, SkipForward, X } from '@tamagui/lucide-icons'
import { memo, useCallback, useEffect, useRef } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface AudioFeedbackProps {
  audioUrl: string | null
  controller: AudioControllerState
  onClose: () => void
  isVisible: boolean
  onRewind?: () => void
  onFastForward?: () => void
  autoHideDelay?: number
  showProgressBar?: boolean
  testID?: string
}

export const AudioFeedback = memo(
  function AudioFeedback({
    audioUrl,
    controller,
    onClose,
    isVisible,
    onRewind,
    onFastForward,
    autoHideDelay = 3000,
    showProgressBar = true,
    testID = 'audio-feedback-overlay',
  }: AudioFeedbackProps) {
    const { isPlaying, currentTime, duration, setIsPlaying, seekTo } = controller
    const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastInteractionRef = useRef<number>(Date.now())

    // Debug logging for component lifecycle and state changes (only in dev mode)
    useEffect(() => {
      if (__DEV__) {
        log.debug('AudioFeedback', 'Component mounted/updated', {
          isVisible,
          audioUrl: audioUrl ? `${audioUrl.substring(0, 50)}...` : null,
          isPlaying,
          currentTime,
          duration,
          progress: duration > 0 ? `${((currentTime / duration) * 100).toFixed(1)}%` : '0%',
        })
      }
    }, [isVisible, audioUrl, isPlaying])

    const resetAutoHideTimer = useCallback(() => {
      log.debug('AudioFeedback', 'Auto-hide timer reset')
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
      lastInteractionRef.current = Date.now()
    }, [])

    const startAutoHideTimer = useCallback(() => {
      log.debug('AudioFeedback', 'Auto-hide timer started', { autoHideDelay })
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
      autoHideTimeoutRef.current = setTimeout(() => {
        const timeSinceLastInteraction = Date.now() - lastInteractionRef.current
        log.debug('AudioFeedback', 'Auto-hide timer triggered', {
          timeSinceLastInteraction,
          autoHideDelay,
          shouldClose: timeSinceLastInteraction >= autoHideDelay,
        })
        if (timeSinceLastInteraction >= autoHideDelay) {
          log.info('AudioFeedback', 'Auto-hiding controls due to inactivity')
          onClose()
        }
      }, autoHideDelay)
    }, [autoHideDelay, onClose])

    // Track previous state to only start timer on actual transitions
    const prevStateRef = useRef({ isVisible: false, isPlaying: false })

    useEffect(() => {
      const prevState = prevStateRef.current
      const currentState = { isVisible, isPlaying }

      // Only log and act on actual state transitions
      const stateChanged = prevState.isVisible !== isVisible || prevState.isPlaying !== isPlaying

      if (stateChanged) {
        log.debug('AudioFeedback', 'Auto-hide timer effect triggered', {
          isVisible,
          isPlaying,
          prevState,
          currentState,
        })

        if (isVisible && isPlaying) {
          startAutoHideTimer()
        } else {
          if (autoHideTimeoutRef.current) {
            log.debug('AudioFeedback', 'Auto-hide timer cleared (not visible or not playing)')
            clearTimeout(autoHideTimeoutRef.current)
          }
        }

        prevStateRef.current = currentState
      }

      return () => {
        if (autoHideTimeoutRef.current) {
          clearTimeout(autoHideTimeoutRef.current)
        }
      }
    }, [isVisible, isPlaying, startAutoHideTimer])

    if (!isVisible || !audioUrl) {
      log.debug('AudioFeedback', 'Component not rendering', { isVisible, hasAudioUrl: !!audioUrl })
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
      log.info('AudioFeedback', 'Rewind button pressed', {
        currentTime,
        newTime,
        duration,
      })
      seekTo(newTime)
      resetAutoHideTimer()
      onRewind?.()
    }

    const handleFastForward = () => {
      const newTime = Math.min(duration, currentTime + 10)
      log.info('AudioFeedback', 'Fast forward button pressed', {
        currentTime,
        newTime,
        duration,
      })
      seekTo(newTime)
      resetAutoHideTimer()
      onFastForward?.()
    }

    const handlePlayPause = () => {
      log.info('AudioFeedback', 'Play/pause button pressed', {
        currentPlaying: isPlaying,
        newPlaying: !isPlaying,
        currentTime,
        duration,
      })
      setIsPlaying(!isPlaying)
      resetAutoHideTimer()
    }

    const handleClose = () => {
      log.info('AudioFeedback', 'Close button pressed')
      onClose()
      resetAutoHideTimer()
    }

    return (
      <YStack
        position="absolute"
        bottom={100}
        width="50%"
        alignSelf="center"
        testID={testID}
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
                  log.info('AudioFeedback', 'Progress bar tapped', {
                    locationX,
                    estimatedWidth,
                    percentage: `${(percentage * 100).toFixed(1)}%`,
                    currentTime,
                    newTime,
                    duration,
                  })
                  seekTo(newTime)
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
  },
  (prev, next) => {
    // Only re-render when these props actually change in a meaningful way.
    // Ignore high-frequency controller fields like currentTime/duration for UI updates.
    return (
      prev.audioUrl === next.audioUrl &&
      prev.isVisible === next.isVisible &&
      prev.autoHideDelay === next.autoHideDelay &&
      prev.showProgressBar === next.showProgressBar &&
      prev.testID === next.testID &&
      prev.controller.isPlaying === next.controller.isPlaying &&
      prev.onClose === next.onClose &&
      prev.onRewind === next.onRewind &&
      prev.onFastForward === next.onFastForward
    )
  }
)
