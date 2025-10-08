import { AudioControllerState } from '@app/features/VideoAnalysis/hooks/useAudioController'
import { log } from '@my/logging'
import { Pause, Play, SkipBack, SkipForward, X } from '@tamagui/lucide-icons'
import { memo, useCallback, useEffect } from 'react'
import { AnimatePresence, Button, Text, XStack, YStack } from 'tamagui'

export interface AudioFeedbackProps {
  audioUrl: string | null
  controller: AudioControllerState
  isVisible: boolean
  onRewind?: () => void
  onFastForward?: () => void
  showProgressBar?: boolean
  testID?: string
  onClose?: () => void
  onInteraction?: () => void
  onInactivity?: () => void
}

export const AudioFeedback = memo(
  function AudioFeedback({
    audioUrl,
    controller,
    isVisible,
    onRewind,
    onFastForward,
    showProgressBar = true,
    testID = 'audio-feedback-overlay',
    onClose,
    onInteraction,
    onInactivity,
  }: AudioFeedbackProps) {
    const { isPlaying, currentTime, duration, setIsPlaying, seekTo } = controller

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

    if (!isVisible || !audioUrl) {
      log.debug('AudioFeedback', 'Component not rendering', { isVisible, hasAudioUrl: !!audioUrl })
    }

    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    const notifyInteraction = useCallback(() => {
      onInteraction?.()
    }, [onInteraction])

    const handleRewind = () => {
      const newTime = Math.max(0, currentTime - 10)
      log.info('AudioFeedback', 'Rewind button pressed', {
        currentTime,
        newTime,
        duration,
      })
      seekTo(newTime)
      onRewind?.()
      notifyInteraction()
    }

    const handleFastForward = () => {
      const newTime = Math.min(duration, currentTime + 10)
      log.info('AudioFeedback', 'Fast forward button pressed', {
        currentTime,
        newTime,
        duration,
      })
      seekTo(newTime)
      onFastForward?.()
      notifyInteraction()
    }

    const handlePlayPause = () => {
      log.info('AudioFeedback', 'Play/pause button pressed', {
        currentPlaying: isPlaying,
        newPlaying: !isPlaying,
        currentTime,
        duration,
      })
      setIsPlaying(!isPlaying)
      if (!isPlaying) {
        onInteraction?.()
      } else {
        onInactivity?.()
      }
    }

    const handleClose = useCallback(() => {
      if (!onClose) {
        log.debug('AudioFeedback', 'Close button pressed but no onClose handler provided')
        return
      }

      log.info('AudioFeedback', 'Close button pressed')
      onClose()
    }, [onClose])

    return (
      <AnimatePresence>
        {isVisible && audioUrl ? (
          <YStack
            key="audio-feedback"
            position="absolute"
            bottom={100}
            width="50%"
            alignSelf="center"
            testID={testID}
            animation="quick"
            enterStyle={{ opacity: 0, y: 20, scale: 0.8 }}
            exitStyle={{ opacity: 0, y: 20, scale: 0.8 }}
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
                      notifyInteraction()
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
        ) : null}
      </AnimatePresence>
    )
  },
  (prev, next) => {
    // Only re-render when these props actually change in a meaningful way.
    // Ignore high-frequency controller fields like currentTime/duration for UI updates.
    return (
      prev.audioUrl === next.audioUrl &&
      prev.isVisible === next.isVisible &&
      prev.showProgressBar === next.showProgressBar &&
      prev.testID === next.testID &&
      prev.controller.isPlaying === next.controller.isPlaying &&
      prev.onInteraction === next.onInteraction &&
      prev.onInactivity === next.onInactivity &&
      prev.onClose === next.onClose &&
      prev.onRewind === next.onRewind &&
      prev.onFastForward === next.onFastForward
    )
  }
)
