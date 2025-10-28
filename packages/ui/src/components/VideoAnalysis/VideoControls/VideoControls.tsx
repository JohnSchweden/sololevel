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
import React, { useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Pressable, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue } from 'react-native-reanimated'
import { Text, XStack, YStack } from 'tamagui'
import { GlassButton } from '../../GlassButton'
import { useControlsVisibility } from './hooks/useControlsVisibility'
import { useProgressBarAnimation } from './hooks/useProgressBarAnimation'
import { useProgressBarGesture } from './hooks/useProgressBarGesture'

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
  // NEW: Collapse progress for early fade-out animation (0 = max, 0.5 = normal, 1 = min)
  collapseProgress?: number
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
        collapseProgress = 0,
      },
      ref
    ) => {
      const [showMenu, setShowMenu] = useState(false)
      const progressBarWidthShared = useSharedValue(300)
      const persistentProgressBarWidthShared = useSharedValue(300)

      // Placeholder callback - will be defined properly after hooks
      const showControlsAndResetTimerRef = useRef<() => void>(() => {})

      // Progress bar gesture hooks for normal and persistent bars
      const normalProgressBar = useProgressBarGesture({
        barType: 'normal',
        duration,
        currentTime,
        progressBarWidthShared,
        onSeek,
        showControlsAndResetTimer: () => showControlsAndResetTimerRef.current(),
      })

      const persistentProgressBar = useProgressBarGesture({
        barType: 'persistent',
        duration,
        currentTime,
        progressBarWidthShared: persistentProgressBarWidthShared,
        onSeek,
        showControlsAndResetTimer: () => showControlsAndResetTimerRef.current(),
      })

      // Extract values from hooks for easier reference
      const isScrubbing = normalProgressBar.isScrubbing || persistentProgressBar.isScrubbing
      const scrubbingPosition = normalProgressBar.scrubbingPosition
      const lastScrubbedPosition = normalProgressBar.lastScrubbedPosition
      const isPersistentScrubbing = persistentProgressBar.isScrubbing
      const persistentScrubbingPosition = persistentProgressBar.scrubbingPosition
      const lastPersistentScrubbedPosition = persistentProgressBar.lastScrubbedPosition
      const progressBarWidth = normalProgressBar.progressBarWidth
      const persistentProgressBarWidth = persistentProgressBar.progressBarWidth
      const setProgressBarWidth = normalProgressBar.setProgressBarWidth
      const setPersistentProgressBarWidth = persistentProgressBar.setProgressBarWidth

      // Controls visibility management hook
      const visibility = useControlsVisibility({
        showControls,
        isPlaying,
        isScrubbing,
        onControlsVisibilityChange,
      })

      // Update the ref to point to the actual function
      showControlsAndResetTimerRef.current = visibility.showControlsAndResetTimer

      // Destructure for easier access
      const { controlsVisible, handlePress, showControlsAndResetTimer } = visibility

      // Remove useEffect animations - replaced with interpolation-based animated styles

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

      // Snapback prevention and shared value sync now handled by useProgressBarGesture hook

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

      // Gesture handlers now provided by useProgressBarGesture hook
      const progressBarCombinedGesture = normalProgressBar.combinedGesture
      const persistentProgressBarCombinedGesture = persistentProgressBar.combinedGesture
      const mainProgressGesture = normalProgressBar.mainGesture
      const persistentProgressGesture = persistentProgressBar.mainGesture

      // Expose handleMenuPress function to parent component via ref
      useImperativeHandle(
        ref,
        () => ({
          triggerMenu: handleMenuPress,
        }),
        [handleMenuPress]
      )

      // Animated styles for progress bars based on collapse progress
      const { persistentBarAnimatedStyle, normalBarAnimatedStyle } =
        useProgressBarAnimation(collapseProgress)

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

            {/* Bottom Controls - Normal Bar */}
            <Animated.View style={normalBarAnimatedStyle}>
              <YStack accessibilityLabel="Video timeline and controls">
                {/* Time and Fullscreen Button Row */}
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  bottom={-24}
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
            </Animated.View>

            {/* Bottom Controls - Persistent Bar */}
            <Animated.View style={persistentBarAnimatedStyle}>
              <YStack accessibilityLabel="Video timeline and controls">
                {/* Time and Fullscreen Button Row */}
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  bottom={-48}
                  paddingBottom="$2"
                  accessibilityLabel="Video time and controls"
                >
                  {/* Time Display - Left side */}
                  <XStack
                    alignItems="center"
                    testID="time-display-persistent"
                    accessibilityLabel={`Current time: ${formatTime(currentTime)}, Total duration: ${formatTime(duration)}`}
                  >
                    <Text
                      fontSize="$3"
                      color="$color"
                      testID="current-time-persistent"
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
                      testID="total-time-persistent"
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
            </Animated.View>

            {/* Progress Bar - Absolutely positioned at bottom, aligned with feedback panel */}
            <Animated.View
              style={[
                {
                  position: 'relative',
                  bottom: 8,
                  left: 0,
                  right: 0,
                  height: 44, // Increased from 30 to 44 for better touch target
                  justifyContent: 'center',
                  zIndex: 30,
                  pointerEvents: 'auto',
                },
                normalBarAnimatedStyle,
              ]}
            >
              <YStack
                height={44}
                justifyContent="center"
                testID="progress-bar-container"
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
            </Animated.View>

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

          {/* Enhanced Persistent Progress Bar - Fades out in max mode */}
          <GestureDetector gesture={persistentProgressBarCombinedGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  bottom: -21,
                  left: 0,
                  right: 0,
                  height: 44, // Increased from 2 to 44 for better touch target
                  justifyContent: 'center',
                },
                persistentBarAnimatedStyle,
              ]}
              pointerEvents={videoMode === 'max' ? 'none' : 'auto'}
            >
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
                  flex: 1,
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
            </Animated.View>
          </GestureDetector>
        </Pressable>
      )
    }
  )
)
