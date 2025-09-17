import {
  Download,
  Maximize2,
  Pause,
  Play,
  Share,
  SkipBack,
  SkipForward,
} from '@tamagui/lucide-icons'
import { AppHeaderContainer } from '@ui/components/AppHeader'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Pressable, PanResponder, View } from 'react-native'
import { Button, Spinner, Text, XStack, YStack } from 'tamagui'

export interface VideoControlsRef {
  triggerMenu: () => void
}

export interface VideoControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  showControls: boolean
  isProcessing?: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onToggleFullscreen?: () => void
  onControlsVisibilityChange?: (visible: boolean) => void
  onMenuPress?: () => void
  headerComponent?: React.ReactNode
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
        onPlay,
        onPause,
        onSeek,
        onToggleFullscreen,
        onControlsVisibilityChange,
        onMenuPress,
        headerComponent,
      },
      ref
    ) => {
      const [controlsVisible, setControlsVisible] = useState(showControls)
      const [isScrubbing, setIsScrubbing] = useState(false)
      const [scrubbingPosition, setScrubbingPosition] = useState<number | null>(null)
      const [showMenu, setShowMenu] = useState(false)
      const [progressBarWidth, setProgressBarWidth] = useState(300) // default width
      const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

      // Auto-hide controls after 3 seconds when playing
      const resetAutoHideTimer = useCallback(() => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }

        if (isPlaying && !isScrubbing) {
          hideTimeoutRef.current = setTimeout(() => {
            setControlsVisible(false)
            onControlsVisibilityChange?.(false)
          }, 3000)
        }
      }, [isPlaying, isScrubbing, onControlsVisibilityChange])

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
        }
      }, [showControls, resetAutoHideTimer])

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
      const progress = isScrubbing && scrubbingPosition !== null
        ? scrubbingPosition
        : duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
      const progressPercentage = Math.round(progress)

      const handleMenuPress = useCallback(() => {
        setShowMenu(true)
        // Reset auto-hide timer when menu is opened
        showControlsAndResetTimer()
        // Notify parent component that menu was pressed (for external menu integration)
        onMenuPress?.()
      }, [showControlsAndResetTimer, onMenuPress])

      const handleMenuItemPress = useCallback((action: string) => {
        console.log(`Menu action: ${action}`)
        setShowMenu(false)
        // Could add specific handlers for different menu actions here
      }, [])

      // Helper to compute seek percentage safely
      const computeSeekPercentage = useCallback(
        (locationX: number) => {
          if (!progressBarWidth || progressBarWidth <= 0) return 0
          return Math.max(0, Math.min(100, (locationX / progressBarWidth) * 100))
        },
        [progressBarWidth]
      )

      // PanResponder for scrubbing functionality
      const panResponder = React.useMemo(
        () => PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (event) => {
            setIsScrubbing(true)
            showControlsAndResetTimer()
            // Get initial touch position
            const { locationX } = event.nativeEvent
            const seekPercentage = computeSeekPercentage(locationX)
            setScrubbingPosition(seekPercentage)
            // Avoid seeking to 0 when duration isn't known yet
            if (duration > 0) {
              const seekTime = (seekPercentage / 100) * duration
              onSeek(seekTime)
            }
          },
          onPanResponderMove: (event) => {
            // Update scrubber position during drag
            const { locationX } = event.nativeEvent
            const seekPercentage = computeSeekPercentage(locationX)
            setScrubbingPosition(seekPercentage)
            if (duration > 0) {
              const seekTime = (seekPercentage / 100) * duration
              onSeek(seekTime)
            }
          },
          onPanResponderRelease: () => {
            setIsScrubbing(false)
            setScrubbingPosition(null)
          },
          onPanResponderTerminate: () => {
            setIsScrubbing(false)
            setScrubbingPosition(null)
          },
        }),
        [computeSeekPercentage, duration, onSeek, showControlsAndResetTimer]
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
          testID="video-controls-pressable"
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
            {/* Header */}
            {headerComponent && <AppHeaderContainer>{headerComponent}</AppHeaderContainer>}

            {/* Center Controls - Absolutely positioned in vertical center of full screen */}
            {isProcessing ? (
              <YStack
                position="absolute"
                inset={0}
                backgroundColor="rgba(0,0,0,0.0)"
                justifyContent="center"
                alignItems="center"
                gap="$4"
                testID="processing-overlay"
                accessibilityLabel="Processing overlay"
              >
                <YStack
                  width={60}
                  height={60}
                  //backgroundColor="$blue9"
                  //borderRadius={30}
                  justifyContent="center"
                  alignItems="center"
                  testID="processing-spinner"
                  accessibilityLabel="Processing spinner"
                  accessibilityRole="progressbar"
                  accessibilityState={{ busy: true }}
                >
                  <Spinner
                    size="large"
                    color="white"
                  />
                </YStack>
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color="white"
                  textAlign="center"
                  accessibilityLabel="Processing video analysis"
                >
                  Analysing video...
                </Text>
              </YStack>
            ) : (
              <XStack
                position="absolute"
                left={0}
                right={0}
                top="50%"
                y="-50%"
                justifyContent="center"
                alignItems="center"
                gap="$4"
                accessibilityLabel="Video playback controls"
              >
                <Button
                  chromeless
                  icon={<SkipBack />}
                  size={60}
                  backgroundColor="rgba(255, 255, 255, 0.60)"
                  borderRadius={30}
                  onPress={() => {
                    showControlsAndResetTimer()
                    onSeek(Math.max(0, currentTime - 10))
                  }}
                  testID="rewind-button"
                  accessibilityLabel="Rewind 10 seconds"
                  accessibilityRole="button"
                  accessibilityHint={`Skip backward 10 seconds from ${formatTime(currentTime)}`}
                />
                <Button
                  chromeless
                  icon={isPlaying ? <Pause /> : <Play />}
                  size={80}
                  backgroundColor="rgba(255,255,255,0.60)"
                  borderRadius={40}
                  onPress={() => {
                    showControlsAndResetTimer()
                    isPlaying ? onPause() : onPlay()
                  }}
                  testID={isPlaying ? 'pause-button' : 'play-button'}
                  accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
                  accessibilityRole="button"
                  accessibilityHint={isPlaying ? 'Pause video playback' : 'Start video playback'}
                  accessibilityState={{ selected: isPlaying }}
                />
                <Button
                  chromeless
                  icon={<SkipForward />}
                  size={60}
                  backgroundColor="rgba(255,255,255,0.60)"
                  borderRadius={30}
                  onPress={() => {
                    showControlsAndResetTimer()
                    onSeek(Math.min(duration, currentTime + 10))
                  }}
                  testID="fast-forward-button"
                  accessibilityLabel="Fast forward 10 seconds"
                  accessibilityRole="button"
                  accessibilityHint={`Skip forward 10 seconds from ${formatTime(currentTime)}`}
                />
              </XStack>
            )}

            {/* Bottom Controls */}
            <YStack accessibilityLabel="Video timeline and controls">
              {/* Time and Fullscreen Button Row - Above Progress Bar */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginBottom={-8}
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
                    color="white"
                    fontWeight="bold"
                    testID="current-time"
                  >
                    {formatTime(currentTime)}
                  </Text>
                  <Text
                    fontSize="$3"
                    color="white"
                    marginHorizontal="$1"
                  >
                    /
                  </Text>
                  <Text
                    fontSize="$3"
                    color="white"
                    testID="total-time"
                  >
                    {formatTime(duration)}
                  </Text>
                </XStack>

                {/* Fullscreen Button - Right side */}
                <Button
                  chromeless
                  icon={<Maximize2 />}
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
                />
              </XStack>

              {/* Progress Bar */}
              <YStack
                height={40}
                justifyContent="center"
                testID="progress-bar-container"
              >
                {/* Background track */}
                <YStack
                  height={4}
                  backgroundColor="$color3"
                  borderRadius={2}
                  position="relative"
                  testID="progress-track"
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout
                    setProgressBarWidth(width)
                  }}
                >
                  {/* Completed progress fill */}
                  <YStack
                    height="100%"
                    width={`${progress}%`}
                    backgroundColor="$yellow9"
                    borderRadius={2}
                    testID="progress-fill"
                    position="absolute"
                    left={0}
                    top={0}
                  />

                  {/* Visible scrubber handle - always shown */}
                  <YStack
                    position="absolute"
                    left={`${progress}%`}
                    top={0}
                    width={24}
                    height={24}
                    marginLeft={-12}
                    marginTop={-10}
                    backgroundColor={isScrubbing ? "$yellow10" : "$yellow9"}
                    borderRadius={12}
                    borderWidth={3}
                    borderColor="white"
                    opacity={controlsVisible || isScrubbing ? 1 : 0.7}
                    animation="quick"
                    testID="scrubber-handle"
                    zIndex={10}
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={isScrubbing ? 0.5 : 0}
                    shadowRadius={4}
                  />
                </YStack>

                {/* PanResponder touch area for scrubbing */}
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 0,
                    right: 0,
                    height: 44,
                    backgroundColor: 'transparent',
                  }}
                  {...panResponder.panHandlers}
                  accessibilityLabel={`Video progress: ${progressPercentage}% complete`}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: progressPercentage }}
                  accessibilityHint="Tap and drag to scrub through video"
                  testID="progress-scrubber"
                />
              </YStack>
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
                  <Button
                    onPress={() => handleMenuItemPress('share')}
                    icon={<Share />}
                    justifyContent="flex-start"
                    backgroundColor="transparent"
                    pressStyle={{ backgroundColor: '$color3' }}
                    size="$4"
                    borderRadius="$3"
                  >
                    Share Video
                  </Button>

                  <Button
                    onPress={() => handleMenuItemPress('download')}
                    icon={<Download />}
                    justifyContent="flex-start"
                    backgroundColor="transparent"
                    pressStyle={{ backgroundColor: '$color3' }}
                    size="$4"
                    borderRadius="$3"
                  >
                    Download Video
                  </Button>

                  <Button
                    onPress={() => handleMenuItemPress('export')}
                    justifyContent="flex-start"
                    backgroundColor="transparent"
                    pressStyle={{ backgroundColor: '$color3' }}
                    size="$4"
                    borderRadius="$3"
                  >
                    Export Analysis
                  </Button>
                </YStack>
              </YStack>
            )}
          </YStack>
        </Pressable>
      )
    }
  )
)

