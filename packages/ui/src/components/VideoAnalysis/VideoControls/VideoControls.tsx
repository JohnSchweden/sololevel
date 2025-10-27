import { log } from '@my/logging'
import {
  Download,
  //Maximize2,
  Pause,
  Play,
  RotateCcw,
  Share,
  SkipBack,
  SkipForward,
} from '@tamagui/lucide-icons'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import { Pressable, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'
import { Text, XStack, YStack } from 'tamagui'
import { GlassButton } from '../../GlassButton'

export interface VideoControlsRef {
  triggerMenu: () => void
}

export interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  showControls: boolean
  isProcessing?: boolean
  videoEnded?: boolean
  onPlay: () => void
  onPause: () => void
  onReplay?: () => void
  onSeek: (time: number) => void
  onControlsVisibilityChange?: (visible: boolean) => void
  onMenuPress?: () => void
  headerComponent?: React.ReactNode
  // NEW: Video mode for persistent progress bar
  videoMode?: 'max' | 'normal' | 'min'
}

export const VideoControls = React.memo(
  forwardRef<VideoControlsRef, VideoControlsProps>(
    (
      {
        isPlaying,
        currentTime,
        duration,
        showControls,
        isProcessing = false,
        videoEnded = false,
        onPlay,
        onPause,
        onReplay,
        onSeek,
        onControlsVisibilityChange,
        onMenuPress,
        headerComponent,
        videoMode = 'max',
      },
      ref
    ) => {
      const [controlsVisible, setControlsVisible] = useState(showControls)
      const [isScrubbing, setIsScrubbing] = useState(false)
      const [scrubbingPosition, setScrubbingPosition] = useState<number | null>(null)
      const [lastScrubbedPosition, setLastScrubbedPosition] = useState<number | null>(null)
      const lastScrubbedPositionShared = useSharedValue<number>(0) // Shared value for worklet access
      const [isPersistentScrubbing, setIsPersistentScrubbing] = useState(false)
      const [persistentScrubbingPosition, setPersistentScrubbingPosition] = useState<number | null>(
        null
      )
      const [lastPersistentScrubbedPosition, setLastPersistentScrubbedPosition] = useState<
        number | null
      >(null)
      const [showMenu, setShowMenu] = useState(false)
      const [progressBarWidth, setProgressBarWidth] = useState(300) // default width
      const [persistentProgressBarWidth, setPersistentProgressBarWidth] = useState(300) // default width for persistent bar
      const progressBarWidthShared = useSharedValue(300)
      const persistentProgressBarWidthShared = useSharedValue(300)
      const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

      // Auto-hide controls after 3 seconds when playing (only if showControls allows it)
      const resetAutoHideTimer = useCallback(() => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }

        // Only start timer if playing and not scrubbing, and showControls doesn't force visibility
        if (isPlaying && !isScrubbing && !showControls) {
          hideTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false)
            onControlsVisibilityChange?.(false)
          }, 2000)
        }
      }, [isPlaying, isScrubbing, showControls, onControlsVisibilityChange])

      // Show controls and reset timer
      const showControlsAndResetTimer = useCallback(() => {
        setControlsVisible(true)
        onControlsVisibilityChange?.(true)
        resetAutoHideTimer()
      }, [resetAutoHideTimer, onControlsVisibilityChange])

      // Handle touch/press to show controls
      const handlePress = useCallback(() => {
        if (!controlsVisible) {
          showControlsAndResetTimer()
        }
      }, [controlsVisible, showControlsAndResetTimer])

      // Update controls visibility when prop changes
      useEffect(() => {
        setControlsVisible(showControls)
        if (showControls) {
          resetAutoHideTimer()
          // Notify parent that controls are shown
          onControlsVisibilityChange?.(true)
        } else {
          // Clear timer if controls are explicitly hidden
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
          }
          // Also notify parent that controls are hidden
          onControlsVisibilityChange?.(false)
        }
      }, [showControls, resetAutoHideTimer, onControlsVisibilityChange])

      // Reset timer when playing state changes
      useEffect(() => {
        resetAutoHideTimer()
      }, [resetAutoHideTimer])

      // Cleanup timer on unmount
      useEffect(() => {
        return () => {
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
          }
        }
      }, [])

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

      // Use scrubbing position during scrubbing, otherwise use current time
      const progress =
        isScrubbing && scrubbingPosition !== null
          ? scrubbingPosition
          : lastScrubbedPosition !== null
            ? lastScrubbedPosition
            : duration > 0
              ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
              : 0

      // Separate progress calculation for persistent progress bar - with snapback prevention
      const persistentProgress =
        isPersistentScrubbing && persistentScrubbingPosition !== null
          ? persistentScrubbingPosition
          : lastPersistentScrubbedPosition !== null
            ? lastPersistentScrubbedPosition
            : duration > 0
              ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
              : 0
      const persistentProgressPercentage = Math.round(persistentProgress)

      // Log state changes for debugging
      React.useEffect(() => {
        log.debug('VideoControls', 'State update', {
          isScrubbing,
          scrubbingPosition,
          isPersistentScrubbing,
          persistentScrubbingPosition,
          progress,
          persistentProgress,
          currentTime,
          duration,
          progressBarWidth,
          persistentProgressBarWidth,
        })
      }, [
        isScrubbing,
        scrubbingPosition,
        isPersistentScrubbing,
        persistentScrubbingPosition,
        progress,
        persistentProgress,
        currentTime,
        duration,
        progressBarWidth,
        persistentProgressBarWidth,
      ])

      // Clear lastScrubbedPosition when video catches up to the scrubbed position
      React.useEffect(() => {
        if (lastScrubbedPosition !== null && duration > 0) {
          const currentProgress = (currentTime / duration) * 100
          const tolerance = 1 // 1% tolerance
          if (Math.abs(currentProgress - lastScrubbedPosition) < tolerance) {
            setLastScrubbedPosition(null)
          }
        }
      }, [currentTime, duration, lastScrubbedPosition])

      // Clear lastPersistentScrubbedPosition when video catches up to the scrubbed position
      React.useEffect(() => {
        if (lastPersistentScrubbedPosition !== null && duration > 0) {
          const currentProgress = (currentTime / duration) * 100
          const tolerance = 1 // 1% tolerance
          if (Math.abs(currentProgress - lastPersistentScrubbedPosition) < tolerance) {
            setLastPersistentScrubbedPosition(null)
          }
        }
      }, [currentTime, duration, lastPersistentScrubbedPosition])

      // Update shared values when state changes
      React.useEffect(() => {
        progressBarWidthShared.value = progressBarWidth
      }, [progressBarWidth, progressBarWidthShared])

      React.useEffect(() => {
        persistentProgressBarWidthShared.value = persistentProgressBarWidth
      }, [persistentProgressBarWidth, persistentProgressBarWidthShared])

      const handleMenuPress = useCallback(() => {
        setShowMenu(true)
        // Reset auto-hide timer when menu is opened
        showControlsAndResetTimer()
        // Notify parent component that menu was pressed (for external menu integration)
        onMenuPress?.()
      }, [showControlsAndResetTimer, onMenuPress])

      const handleMenuItemPress = useCallback((action: string) => {
        log.info('VideoControls', `🎛️ Menu action: ${action}`)
        setShowMenu(false)
        // Could add specific handlers for different menu actions here
      }, [])

      // Enhanced combined gesture for progress bar - handles both tap and drag with better reliability
      const progressBarCombinedGesture = useMemo(
        () =>
          Gesture.Pan()
            .minDistance(0) // Allow immediate activation (for taps)
            .maxPointers(1) // Single finger only for reliability
            .activateAfterLongPress(0) // Immediate activation
            .onBegin((event) => {
              // Early activation - more reliable than onStart
              const seekPercentage =
                progressBarWidthShared.value > 0
                  ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                  : 0

              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Progress bar touch begin', {
                eventX: event.x,
                eventY: event.y,
                progressBarWidth: progressBarWidthShared.value,
                seekPercentage,
                duration,
              })
            })
            .onStart((event) => {
              // Calculate seek percentage from touch position
              const seekPercentage =
                progressBarWidthShared.value > 0
                  ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                  : 0

              // Store position for potential drag
              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Progress bar touch start', {
                eventX: event.x,
                progressBarWidth: progressBarWidthShared.value,
                seekPercentage,
                duration,
              })
              // For immediate taps (no dragging), seek right away
              if (duration > 0 && seekPercentage >= 0) {
                // Changed condition: allow seeking to 0%
                const seekTime = (seekPercentage / 100) * duration
                runOnJS(log.debug)('VideoControls', 'Immediate seek', {
                  seekPercentage,
                  seekTime,
                  duration,
                })
                runOnJS(onSeek)(seekTime)
              } else {
                runOnJS(log.debug)('VideoControls', 'Seek skipped', {
                  duration,
                  seekPercentage,
                  reason: duration <= 0 ? 'duration is 0' : 'other',
                })
              }
            })
            .onUpdate((event) => {
              // Lower threshold for drag detection - more responsive
              const dragThreshold = 3
              if (
                Math.abs(event.translationX) > dragThreshold ||
                Math.abs(event.translationY) > dragThreshold
              ) {
                runOnJS(setIsScrubbing)(true)
                runOnJS(showControlsAndResetTimer)()

                const seekPercentage =
                  progressBarWidthShared.value > 0
                    ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                    : 0

                runOnJS(setScrubbingPosition)(seekPercentage)
                lastScrubbedPositionShared.value = seekPercentage
                runOnJS(log.debug)('VideoControls', 'Progress bar drag', {
                  eventX: event.x,
                  translationX: event.translationX,
                  progressBarWidth: progressBarWidthShared.value,
                  seekPercentage,
                })
              }
            })
            .onEnd(() => {
              // Only seek again if we were in scrubbing mode (dragging)
              const wasScrubbing = isScrubbing
              runOnJS(setIsScrubbing)(false)

              if (wasScrubbing) {
                const currentPosition = lastScrubbedPositionShared.value
                runOnJS(setLastScrubbedPosition)(currentPosition)
                runOnJS(setScrubbingPosition)(null)

                if (duration > 0 && currentPosition >= 0) {
                  // Allow seeking to 0%
                  const seekTime = (currentPosition / 100) * duration
                  runOnJS(log.debug)('VideoControls', 'Drag end seek', {
                    seekPercentage: currentPosition,
                    seekTime,
                    duration,
                  })
                  runOnJS(onSeek)(seekTime)
                }
              }
            })
            .onFinalize(() => {
              // Ensure cleanup on gesture cancellation
              runOnJS(setIsScrubbing)(false)
              runOnJS(setScrubbingPosition)(null)
            })
            .simultaneousWithExternalGesture(),
        [duration, onSeek, showControlsAndResetTimer, isScrubbing]
      )

      // Enhanced combined gesture for persistent progress bar - handles both tap and drag with better reliability
      const persistentProgressBarCombinedGesture = useMemo(
        () =>
          Gesture.Pan()
            .minDistance(0) // Allow immediate activation (for taps)
            .maxPointers(1) // Single finger only for reliability
            .activateAfterLongPress(0) // Immediate activation
            .onBegin((event) => {
              // Early activation - more reliable than onStart
              const seekPercentage =
                persistentProgressBarWidthShared.value > 0
                  ? Math.max(
                      0,
                      Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                    )
                  : 0

              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Persistent progress bar touch begin', {
                eventX: event.x,
                eventY: event.y,
                progressBarWidth: persistentProgressBarWidthShared.value,
                seekPercentage,
                duration,
              })
            })
            .onStart((event) => {
              // Calculate seek percentage from touch position using persistent bar width
              const seekPercentage =
                persistentProgressBarWidthShared.value > 0
                  ? Math.max(
                      0,
                      Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                    )
                  : 0

              // Store position for potential drag
              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Persistent progress bar touch start', {
                eventX: event.x,
                progressBarWidth: persistentProgressBarWidthShared.value,
                seekPercentage,
                duration,
              })

              // For immediate taps (no dragging), seek right away - allow seeking to 0%
              if (duration > 0 && seekPercentage >= 0) {
                const seekTime = (seekPercentage / 100) * duration
                runOnJS(log.debug)('VideoControls', 'Persistent immediate seek', {
                  seekPercentage,
                  seekTime,
                  duration,
                })
                runOnJS(onSeek)(seekTime)
              } else {
                runOnJS(log.debug)('VideoControls', 'Persistent seek skipped', {
                  duration,
                  seekPercentage,
                  reason: duration <= 0 ? 'duration is 0' : 'other',
                })
              }
            })
            .onUpdate((event) => {
              // Lower threshold for drag detection - more responsive
              const dragThreshold = 3
              if (
                Math.abs(event.translationX) > dragThreshold ||
                Math.abs(event.translationY) > dragThreshold
              ) {
                runOnJS(setIsPersistentScrubbing)(true)
                runOnJS(showControlsAndResetTimer)()

                const seekPercentage =
                  persistentProgressBarWidthShared.value > 0
                    ? Math.max(
                        0,
                        Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                      )
                    : 0

                runOnJS(setPersistentScrubbingPosition)(seekPercentage)
                lastScrubbedPositionShared.value = seekPercentage
                runOnJS(log.debug)('VideoControls', 'Persistent progress bar drag', {
                  eventX: event.x,
                  translationX: event.translationX,
                  progressBarWidth: persistentProgressBarWidthShared.value,
                  seekPercentage,
                })
              }
            })
            .onEnd(() => {
              // Only seek again if we were in scrubbing mode (dragging)
              const wasScrubbing = isPersistentScrubbing
              runOnJS(setIsPersistentScrubbing)(false)

              if (wasScrubbing) {
                const currentPosition = lastScrubbedPositionShared.value
                runOnJS(setLastPersistentScrubbedPosition)(currentPosition) // Store for snapback prevention
                runOnJS(setPersistentScrubbingPosition)(null)

                if (duration > 0 && currentPosition >= 0) {
                  // Allow seeking to 0%
                  const seekTime = (currentPosition / 100) * duration
                  runOnJS(log.debug)('VideoControls', 'Persistent drag end seek', {
                    seekPercentage: currentPosition,
                    seekTime,
                    duration,
                  })
                  runOnJS(onSeek)(seekTime)
                }
              }
            })
            .onFinalize(() => {
              // Ensure cleanup on gesture cancellation
              runOnJS(setIsPersistentScrubbing)(false)
              runOnJS(setPersistentScrubbingPosition)(null)
            })
            .simultaneousWithExternalGesture(),
        [duration, onSeek, showControlsAndResetTimer, isPersistentScrubbing]
      )

      // Enhanced gesture handler for main progress bar scrubbing functionality - more reliable
      const mainProgressGesture = useMemo(
        () =>
          Gesture.Pan()
            .maxPointers(1) // Single finger only for reliability
            .activateAfterLongPress(0) // Immediate activation
            .onBegin((event) => {
              // Early activation - more reliable
              runOnJS(setIsScrubbing)(true)
              runOnJS(showControlsAndResetTimer)()

              const seekPercentage =
                progressBarWidthShared.value > 0
                  ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                  : 0

              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Main gesture begin', {
                eventX: event.x,
                eventY: event.y,
                progressBarWidth: progressBarWidthShared.value,
                seekPercentage,
              })
            })
            .onStart((event) => {
              runOnJS(setIsScrubbing)(true)
              runOnJS(showControlsAndResetTimer)()
              // Calculate seek percentage inline to avoid worklet issues
              const seekPercentage =
                progressBarWidthShared.value > 0
                  ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                  : 0
              runOnJS(setScrubbingPosition)(seekPercentage)
              // Store the position in shared value for onEnd
              lastScrubbedPositionShared.value = seekPercentage
              // Debug logging
              runOnJS(log.debug)('VideoControls', 'Gesture onStart', {
                eventX: event.x,
                eventAbsoluteX: event.absoluteX,
                progressBarWidth: progressBarWidthShared.value,
                seekPercentage,
              })
              // DO NOT SEEK HERE - wait for gesture end
            })
            .onUpdate((event) => {
              // More lenient horizontal gesture detection - reduced threshold
              const horizontalThreshold = 3
              if (
                Math.abs(event.translationY) > Math.abs(event.translationX) &&
                Math.abs(event.translationY) > horizontalThreshold
              ) {
                return
              }
              // Calculate seek percentage inline to avoid worklet issues
              const seekPercentage =
                progressBarWidthShared.value > 0
                  ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                  : 0
              runOnJS(setScrubbingPosition)(seekPercentage)
              // Store the position in shared value for onEnd
              lastScrubbedPositionShared.value = seekPercentage
              // Debug logging
              runOnJS(log.debug)('VideoControls', 'Gesture onUpdate', {
                eventX: event.x,
                eventAbsoluteX: event.absoluteX,
                translationX: event.translationX,
                progressBarWidth: progressBarWidthShared.value,
                seekPercentage,
              })
              // DO NOT SEEK HERE - wait for gesture end
            })
            .onEnd(() => {
              // Seek ONLY on gesture end with the final scrubbed position
              const currentPosition = lastScrubbedPositionShared.value
              runOnJS(log.debug)('VideoControls', 'Gesture onEnd called', {
                lastScrubbedPosition: currentPosition,
                duration,
              })
              runOnJS(setIsScrubbing)(false)
              runOnJS(setLastScrubbedPosition)(currentPosition)
              runOnJS(setScrubbingPosition)(null)

              // SEEK ONLY ONCE AT END with final position - allow seeking to 0%
              if (duration > 0 && currentPosition >= 0) {
                const seekTime = (currentPosition / 100) * duration
                runOnJS(log.debug)('VideoControls', 'Gesture end - seeking', {
                  seekPercentage: currentPosition,
                  seekTime,
                  duration,
                })
                runOnJS(onSeek)(seekTime)
              }
            })
            .onFinalize(() => {
              const currentPosition = lastScrubbedPositionShared.value
              runOnJS(log.debug)('VideoControls', 'Gesture onFinalize called', {
                lastScrubbedPosition: currentPosition,
                duration,
              })
              runOnJS(setIsScrubbing)(false)
              runOnJS(setLastScrubbedPosition)(currentPosition)
              runOnJS(setScrubbingPosition)(null)
            })
            .shouldCancelWhenOutside(false)
            .minDistance(0)
            .simultaneousWithExternalGesture(),
        [duration, onSeek, showControlsAndResetTimer]
      )

      // Enhanced gesture handler for persistent progress bar scrubbing functionality - more reliable
      const persistentProgressGesture = useMemo(
        () =>
          Gesture.Pan()
            .maxPointers(1) // Single finger only for reliability
            .activateAfterLongPress(0) // Immediate activation
            .onBegin((event) => {
              // Early activation - more reliable
              runOnJS(setIsPersistentScrubbing)(true)
              runOnJS(showControlsAndResetTimer)()

              const seekPercentage =
                persistentProgressBarWidthShared.value > 0
                  ? Math.max(
                      0,
                      Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                    )
                  : 0

              lastScrubbedPositionShared.value = seekPercentage
              runOnJS(log.debug)('VideoControls', 'Persistent gesture begin', {
                eventX: event.x,
                eventY: event.y,
                progressBarWidth: persistentProgressBarWidthShared.value,
                seekPercentage,
              })
            })
            .onStart((event) => {
              runOnJS(setIsPersistentScrubbing)(true)
              runOnJS(showControlsAndResetTimer)()
              // Calculate seek percentage inline to avoid worklet issues
              const seekPercentage =
                persistentProgressBarWidthShared.value > 0
                  ? Math.max(
                      0,
                      Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                    )
                  : 0
              runOnJS(setPersistentScrubbingPosition)(seekPercentage)
              lastScrubbedPositionShared.value = seekPercentage
              // DO NOT SEEK HERE - wait for gesture end
            })
            .onUpdate((event) => {
              // More lenient horizontal gesture detection - reduced threshold
              const horizontalThreshold = 3
              if (
                Math.abs(event.translationY) > Math.abs(event.translationX) &&
                Math.abs(event.translationY) > horizontalThreshold
              ) {
                return
              }
              // Calculate seek percentage inline to avoid worklet issues
              const seekPercentage =
                persistentProgressBarWidthShared.value > 0
                  ? Math.max(
                      0,
                      Math.min(100, (event.x / persistentProgressBarWidthShared.value) * 100)
                    )
                  : 0
              runOnJS(setPersistentScrubbingPosition)(seekPercentage)
              lastScrubbedPositionShared.value = seekPercentage
              // DO NOT SEEK HERE - wait for gesture end
            })
            .onEnd(() => {
              // Seek ONLY on gesture end with the final scrubbed position
              const currentPosition = lastScrubbedPositionShared.value
              runOnJS(setIsPersistentScrubbing)(false)
              runOnJS(setLastPersistentScrubbedPosition)(currentPosition) // Store for snapback prevention
              runOnJS(setPersistentScrubbingPosition)(null)

              // SEEK ONLY ONCE AT END with final position - allow seeking to 0%
              if (duration > 0 && currentPosition >= 0) {
                const seekTime = (currentPosition / 100) * duration
                runOnJS(log.debug)('VideoControls', 'Persistent gesture end - seeking', {
                  seekPercentage: currentPosition,
                  seekTime,
                  duration,
                })
                runOnJS(onSeek)(seekTime)
              }
            })
            .onFinalize(() => {
              runOnJS(setIsPersistentScrubbing)(false)
              runOnJS(setPersistentScrubbingPosition)(null)
            })
            .shouldCancelWhenOutside(false)
            .minDistance(0)
            .simultaneousWithExternalGesture(),
        [duration, onSeek, showControlsAndResetTimer]
      )

      // Expose handleMenuPress function to parent component via ref
      useImperativeHandle(
        ref,
        () => ({
          triggerMenu: handleMenuPress,
        }),
        [handleMenuPress]
      )

      return (
        <Pressable
          onPress={handlePress}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          testID="video-controls-container"
        >
          <YStack
            position="absolute"
            inset={0}
            backgroundColor="rgba(0,0,0,0.6)"
            justifyContent="flex-end"
            padding="$4"
            opacity={controlsVisible ? 1 : 0}
            pointerEvents={controlsVisible ? 'auto' : 'none'}
            animation="quick"
            testID="video-controls-overlay"
            accessibilityLabel={`Video controls overlay ${controlsVisible ? 'visible' : 'hidden'}`}
            accessibilityRole="toolbar"
            accessibilityState={{ expanded: controlsVisible }}
          >
            {/* Header - deprecated, use NavigationAppHeader instead */}
            {headerComponent && headerComponent}

            {/* Center Controls - Absolutely positioned in vertical center of full screen */}
            <XStack
              position="absolute"
              left={0}
              right={0}
              top="50%"
              y="-50%"
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
                onPress={() => {
                  showControlsAndResetTimer()
                  onSeek(Math.max(0, currentTime - 10))
                }}
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
                onPress={() => {
                  showControlsAndResetTimer()
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
                onPress={() => {
                  showControlsAndResetTimer()
                  onSeek(Math.min(duration, currentTime + 10))
                }}
                testID="fast-forward-button"
                accessibilityLabel="Fast forward 10 seconds"
                accessibilityHint={`Skip forward 10 seconds from ${formatTime(currentTime)}`}
              />
            </XStack>

            {/* Bottom Controls */}
            <YStack accessibilityLabel="Video timeline and controls">
              {/* Time and Fullscreen Button Row */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingBottom="$2"
                accessibilityLabel="Video time and controls"
              >
                {/* Time Display - Left side */}
                <XStack
                  alignItems="center"
                  testID="time-display"
                  accessibilityLabel={`Current time: ${formatTime(currentTime)}, Total duration: ${formatTime(duration)}`}
                >
                  <Text
                    fontSize="$3"
                    color="$color"
                    testID="current-time"
                  >
                    {formatTime(currentTime)}
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color11"
                    marginHorizontal="$1"
                  >
                    /
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$color11"
                    testID="total-time"
                  >
                    {formatTime(duration)}
                  </Text>
                </XStack>

                {/* Fullscreen Button - Right side */}
                {/* <Button
                  chromeless
                  // icon={<Maximize2 />}
                  size={44}
                  color="white"
                  onPress={() => {
                    showControlsAndResetTimer()
                    onToggleFullscreen?.()
                  }}
                  testID="fullscreen-button"
                  accessibilityLabel="Toggle fullscreen mode"
                  accessibilityRole="button"
                  accessibilityHint="Tap to enter or exit fullscreen mode"
                /> */}
              </XStack>
            </YStack>

            {/* Progress Bar - Absolutely positioned at bottom, aligned with feedback panel */}
            <YStack
              position="relative"
              bottom={0}
              //bottom={-10} // Extend slightly below video area to align with feedback panel
              left={0}
              right={0}
              height={44} // Increased from 30 to 44 for better touch target
              justifyContent="center"
              testID="progress-bar-container"
              zIndex={30}
              // Allow touch events for gesture handling
              pointerEvents="auto"
            >
              {/* Enhanced touch-friendly background track */}
              <GestureDetector gesture={progressBarCombinedGesture}>
                <Pressable
                  onPress={(event) => {
                    // Fallback handler for cases where gesture fails
                    const { locationX } = event.nativeEvent
                    if (progressBarWidth > 0 && duration > 0) {
                      const seekPercentage = Math.max(
                        0,
                        Math.min(100, (locationX / progressBarWidth) * 100)
                      )
                      const seekTime = (seekPercentage / 100) * duration
                      log.debug('VideoControls', 'Fallback press handler', {
                        locationX,
                        progressBarWidth,
                        seekPercentage,
                        seekTime,
                        duration,
                      })
                      onSeek(seekTime)
                      showControlsAndResetTimer()
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <YStack
                    height={44} // Match container height for full touch area
                    backgroundColor="transparent" // Transparent for larger touch area
                    borderRadius={2}
                    position="relative"
                    testID="progress-track"
                    justifyContent="center" // Center the visual track
                    onLayout={(event) => {
                      const { width } = event.nativeEvent.layout
                      setProgressBarWidth(width)
                    }}
                  >
                    {/* Visual progress track - smaller but touch area is larger */}
                    <YStack
                      height={4}
                      backgroundColor="$color3"
                      borderRadius={2}
                      position="relative"
                    >
                      {/* Completed progress fill */}
                      <YStack
                        height="100%"
                        width={`${progress}%`}
                        backgroundColor="$teal9"
                        borderRadius={2}
                        testID="progress-fill"
                        position="absolute"
                        left={0}
                        top={0}
                      />

                      {/* Enhanced scrubber handle with larger touch area */}
                      <GestureDetector gesture={mainProgressGesture}>
                        <View
                          style={{
                            position: 'absolute',
                            left: `${progress}%`,
                            top: -20, // Centered within the 44px touch area
                            width: 44, // Larger touch area
                            height: 44, // Larger touch area
                            marginLeft: -22, // Center the touch area
                            zIndex: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {/* Visual handle - smaller but touch area is larger */}
                          <YStack
                            width={14}
                            height={14}
                            backgroundColor={isScrubbing ? '$teal10' : '$teal9'}
                            borderRadius={12}
                            borderWidth={0}
                            borderColor="$color12"
                            opacity={controlsVisible || isScrubbing ? 1 : 0.7}
                            animation="quick"
                            testID="scrubber-handle"
                            elevation={isScrubbing ? 2 : 0}
                          />
                        </View>
                      </GestureDetector>
                    </YStack>
                  </YStack>
                </Pressable>
              </GestureDetector>
            </YStack>

            {/* Fly-out Menu - Temporarily disabled for testing */}
            {/* TODO: Re-enable Sheet component after fixing mock */}
            {showMenu && (
              <YStack
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                backgroundColor="$background"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                padding="$4"
                gap="$3"
                zIndex={20}
                testID="menu-overlay"
              >
                <Text
                  fontSize="$6"
                  fontWeight="600"
                  textAlign="center"
                >
                  Video Options
                </Text>

                <YStack gap="$2">
                  <XStack>
                    <GlassButton
                      onPress={() => handleMenuItemPress('share')}
                      icon={
                        <Share
                          size="$1"
                          color="white"
                        />
                      }
                      minHeight={44}
                      backgroundColor="transparent"
                    >
                      <Text
                        color="white"
                        fontSize="$4"
                      >
                        Share Video
                      </Text>
                    </GlassButton>
                  </XStack>

                  <XStack>
                    <GlassButton
                      onPress={() => handleMenuItemPress('download')}
                      icon={
                        <Download
                          size="$1"
                          color="white"
                        />
                      }
                      minHeight={44}
                      backgroundColor="transparent"
                    >
                      <Text
                        color="white"
                        fontSize="$4"
                      >
                        Download Video
                      </Text>
                    </GlassButton>
                  </XStack>

                  <XStack>
                    <GlassButton
                      onPress={() => handleMenuItemPress('export')}
                      minHeight={44}
                      backgroundColor="transparent"
                    >
                      <Text
                        color="white"
                        fontSize="$4"
                      >
                        Export Analysis
                      </Text>
                    </GlassButton>
                  </XStack>
                </YStack>
              </YStack>
            )}
          </YStack>

          {/* Enhanced Persistent Progress Bar - Hidden in max mode */}
          {videoMode !== 'max' && (
            <GestureDetector gesture={persistentProgressBarCombinedGesture}>
              <Pressable
                onPress={(event) => {
                  // Fallback handler for cases where gesture fails
                  const { locationX } = event.nativeEvent
                  if (persistentProgressBarWidth > 0 && duration > 0) {
                    const seekPercentage = Math.max(
                      0,
                      Math.min(100, (locationX / persistentProgressBarWidth) * 100)
                    )
                    const seekTime = (seekPercentage / 100) * duration
                    log.debug('VideoControls', 'Persistent fallback press handler', {
                      locationX,
                      persistentProgressBarWidth,
                      seekPercentage,
                      seekTime,
                      duration,
                    })
                    onSeek(seekTime)
                    showControlsAndResetTimer()
                  }
                }}
                style={{
                  position: 'absolute',
                  bottom: -21,
                  left: 0,
                  right: 0,
                  height: 44, // Increased from 2 to 44 for better touch target
                  justifyContent: 'center',
                }}
              >
                <YStack
                  height={44} // Match container height for full touch area
                  backgroundColor="transparent" // Transparent for larger touch area
                  opacity={0.8}
                  testID="persistent-progress-bar"
                  accessibilityLabel={`Video progress: ${persistentProgressPercentage}% complete`}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: persistentProgressPercentage }}
                  justifyContent="center" // Center the visual track
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout
                    setPersistentProgressBarWidth(width)
                  }}
                >
                  {/* Visual progress track - smaller but touch area is larger */}
                  <YStack
                    height={2}
                    backgroundColor="$color8"
                    position="relative"
                  >
                    {/* Progress fill */}
                    <YStack
                      height="100%"
                      width={`${persistentProgress}%`}
                      backgroundColor={controlsVisible ? '$teal9' : '$color11'}
                      testID="persistent-progress-fill"
                    />

                    <YStack paddingLeft={10}>
                      {/* Enhanced scrubber handle with larger touch area */}
                      <GestureDetector gesture={persistentProgressGesture}>
                        <View
                          style={{
                            position: 'absolute',
                            left: `${persistentProgress}%`,
                            top: -22, // Centered within the 44px touch area
                            width: 44, // Larger touch area
                            height: 44, // Larger touch area
                            marginLeft: -17, // Center the touch area
                            zIndex: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {/* Visual handle - smaller but touch area is larger */}
                          <YStack
                            width={10}
                            height={10}
                            backgroundColor={
                              controlsVisible
                                ? isPersistentScrubbing
                                  ? '$teal10'
                                  : '$teal9'
                                : '$color8'
                            }
                            borderRadius={8}
                            borderWidth={0}
                            borderColor="$color12"
                            opacity={controlsVisible || isPersistentScrubbing ? 1 : 0}
                            animation="quick"
                            testID="persistent-scrubber-handle"
                            elevation={isPersistentScrubbing ? 2 : 0}
                          />
                        </View>
                      </GestureDetector>
                    </YStack>
                  </YStack>
                </YStack>
              </Pressable>
            </GestureDetector>
          )}
        </Pressable>
      )
    }
  )
)
