import { useAnimationCompletion, useFrameDropDetection, useSmoothnessTracking } from '@my/app/hooks'
import { log } from '@my/logging'
import { Download, Share } from '@tamagui/lucide-icons'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Pressable } from 'react-native'
import Animated, { useSharedValue, cancelAnimation } from 'react-native-reanimated'
import { Text, XStack, YStack } from 'tamagui'

import { GlassButton } from '../../GlassButton'
import { CenterControls } from './components/CenterControls'
import { ProgressBar } from './components/ProgressBar'
import { TimeDisplay } from './components/TimeDisplay'
import {
  type AnimationInteractionType,
  useConditionalAnimationTiming,
} from './hooks/useConditionalAnimationTiming'
import { useControlsVisibility } from './hooks/useControlsVisibility'
import { useProgressBarAnimation } from './hooks/useProgressBarAnimation'
import { useProgressBarGesture } from './hooks/useProgressBarGesture'

export interface VideoControlsRef {
  triggerMenu: () => void
}

export interface PersistentProgressBarProps {
  progress: number
  isScrubbing: boolean
  controlsVisible: boolean
  progressBarWidth: number
  animatedStyle: any
  combinedGesture: any
  mainGesture: any
  onLayout: (event: any) => void
  onFallbackPress: (locationX: number) => void
  animationName?: 'quick' | 'lazy'
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
  onControlsVisibilityChange?: (visible: boolean, isUserInteraction?: boolean) => void
  onMenuPress?: () => void
  headerComponent?: React.ReactNode
  // NEW: Video mode for persistent progress bar
  videoMode?: 'max' | 'normal' | 'min'
  // NEW: Collapse progress for early fade-out animation (0 = max, 0.5 = normal, 1 = min)
  collapseProgress?: number
  // NEW: Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
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
        videoMode: _videoMode = 'max', // Reserved for future pointer events control
        collapseProgress = 0,
        onPersistentProgressBarPropsChange,
      },
      ref
    ) => {
      const [showMenu, setShowMenu] = useState(false)
      const progressBarWidthShared = useSharedValue(300)
      const persistentProgressBarWidthShared = useSharedValue(300)

      // Conditional animation timing hook
      const { getAnimationName, getAnimationDuration } = useConditionalAnimationTiming()

      // Track current interaction type for conditional animation timing
      const [currentInteractionType, setCurrentInteractionType] =
        useState<AnimationInteractionType>('user-tap')

      // Convert collapseProgress to SharedValue to prevent JS→worklet race conditions
      // This eliminates memory corruption when worklets access JS values during animations
      const collapseProgressShared = useSharedValue(collapseProgress)

      // Sync collapseProgress prop to shared value
      // This ensures worklets always read the latest value without accessing JS memory
      useEffect(() => {
        collapseProgressShared.value = collapseProgress
      }, [collapseProgress, collapseProgressShared])

      // Cleanup shared values on unmount to prevent memory corruption
      // This prevents Reanimated worklets from accessing freed memory during shadow tree cloning
      useEffect(() => {
        return () => {
          // Cancel any pending animations on these shared values
          // This ensures worklets don't try to update values after component unmounts
          cancelAnimation(progressBarWidthShared)
          cancelAnimation(persistentProgressBarWidthShared)
          cancelAnimation(collapseProgressShared)
        }
      }, [progressBarWidthShared, persistentProgressBarWidthShared, collapseProgressShared])

      // Determine interaction type based on videoEnded status
      // This allows us to use different animation timing for playback-end vs other interactions
      useEffect(() => {
        if (videoEnded) {
          setCurrentInteractionType('playback-end')
        }
      }, [videoEnded])

      // Wrapped callback to track interaction type for conditional animation timing
      const handleControlsVisibilityChange = useCallback(
        (visible: boolean, isUserInteraction?: boolean) => {
          // Determine interaction type:
          // - If user interaction → 'user-tap'
          // - If automatic hide (not user interaction) → 'auto-hide'
          // - If video ended → 'playback-end' (already set by videoEnded effect)
          if (isUserInteraction) {
            setCurrentInteractionType('user-tap')
          } else if (!visible) {
            // Automatic hide
            setCurrentInteractionType('auto-hide')
          }

          // Forward to parent callback
          onControlsVisibilityChange?.(visible, isUserInteraction)
        },
        [onControlsVisibilityChange]
      )

      // Controls visibility management hook
      const visibility = useControlsVisibility({
        showControls,
        isPlaying,
        isScrubbing: false, // Initial value, will be updated below
        onControlsVisibilityChange: handleControlsVisibilityChange,
      })

      // Destructure for easier access
      const { controlsVisible, handlePress, showControlsAndResetTimer } = visibility

      // Track previous controlsVisible for direction detection
      const prevControlsVisibleForAnimationRef = useRef(controlsVisible)

      // Determine animation direction
      const animationDirection =
        prevControlsVisibleForAnimationRef.current !== controlsVisible
          ? controlsVisible
            ? 'fade-in'
            : 'fade-out'
          : 'stable'

      // Update previous value
      useEffect(() => {
        prevControlsVisibleForAnimationRef.current = controlsVisible
      }, [controlsVisible])

      // Use conditional animation timing based on interaction type
      const estimatedDuration = getAnimationDuration(currentInteractionType)

      // 1. True animation completion detection
      const completion = useAnimationCompletion({
        currentValue: controlsVisible ? 1 : 0,
        targetValue: controlsVisible ? 1 : 0,
        estimatedDuration,
        componentName: 'VideoControls',
        animationName: `controls-overlay-${currentInteractionType}`,
        direction: animationDirection !== 'stable' ? animationDirection : undefined,
        tolerance: 0.01,
        requiredStableFrames: 2,
      })

      // 2. Smoothness tracking
      const smoothness = useSmoothnessTracking({
        duration: completion.actualDuration,
        componentName: 'VideoControls',
        animationName: `controls-overlay-${currentInteractionType}`,
        windowSize: 10,
      })
      void smoothness

      // 3. Frame drop detection
      const frameDrops = useFrameDropDetection({
        isActive: completion.isComplete === false,
        componentName: 'VideoControls',
        animationName: `controls-overlay-${currentInteractionType}`,
      })
      void frameDrops

      // Progress bar gesture hooks for normal and persistent bars
      const normalProgressBar = useProgressBarGesture({
        barType: 'normal',
        duration,
        currentTime,
        progressBarWidthShared,
        onSeek,
        showControlsAndResetTimer,
      })

      const persistentProgressBar = useProgressBarGesture({
        barType: 'persistent',
        duration,
        currentTime,
        progressBarWidthShared: persistentProgressBarWidthShared,
        onSeek,
        showControlsAndResetTimer,
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

      // Animated styles for progress bars based on collapse progress
      // Pass shared value to prevent JS→worklet race conditions
      const { persistentBarAnimatedStyle, normalBarAnimatedStyle } =
        useProgressBarAnimation(collapseProgressShared)

      // Expose handleMenuPress to parent component via ref
      useImperativeHandle(
        ref,
        () => ({
          triggerMenu: handleMenuPress,
        }),
        [handleMenuPress]
      )

      // Provide persistent progress bar props to parent via callback for rendering at layout level
      // This ensures React properly tracks and re-renders the progress bar when props change
      useEffect(() => {
        if (!onPersistentProgressBarPropsChange) {
          return
        }

        onPersistentProgressBarPropsChange({
          progress: persistentProgress,
          isScrubbing: persistentProgressBar.isScrubbing,
          controlsVisible,
          progressBarWidth: persistentProgressBarWidth,
          animatedStyle: persistentBarAnimatedStyle,
          combinedGesture: persistentProgressBarCombinedGesture,
          mainGesture: persistentProgressGesture,
          animationName: getAnimationName(currentInteractionType),
          onLayout: (event) => {
            const { width } = event.nativeEvent.layout
            setPersistentProgressBarWidth(width)
          },
          onFallbackPress: (locationX) => {
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
          },
        })
      }, [
        persistentProgress,
        persistentProgressBar.isScrubbing,
        controlsVisible,
        persistentProgressBarWidth,
        persistentBarAnimatedStyle,
        persistentProgressBarCombinedGesture,
        persistentProgressGesture,
        setPersistentProgressBarWidth,
        duration,
        onSeek,
        showControlsAndResetTimer,
        onPersistentProgressBarPropsChange,
        currentInteractionType,
        getAnimationName,
      ])

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
            backgroundColor="rgba(0,0,0,0.5)"
            justifyContent="flex-end"
            padding="$4"
            opacity={controlsVisible ? 1 : 0}
            pointerEvents={controlsVisible ? 'auto' : 'none'}
            animation={getAnimationName(currentInteractionType)}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            testID="video-controls-overlay"
            accessibilityLabel={`Video controls overlay ${controlsVisible ? 'visible' : 'hidden'}`}
            accessibilityRole="toolbar"
            accessibilityState={{ expanded: controlsVisible }}
          >
            {/* Header - deprecated, use NavigationAppHeader instead */}
            {headerComponent && headerComponent}

            {/* Center Controls - Absolutely positioned in vertical center of full screen */}
            <CenterControls
              isPlaying={isPlaying}
              videoEnded={videoEnded}
              isProcessing={isProcessing}
              currentTime={currentTime}
              onPlay={() => {
                showControlsAndResetTimer()
                onPlay()
              }}
              onPause={() => {
                showControlsAndResetTimer()
                onPause()
              }}
              onReplay={
                onReplay
                  ? () => {
                      showControlsAndResetTimer()
                      onReplay()
                    }
                  : undefined
              }
              onSkipBackward={() => {
                showControlsAndResetTimer()
                onSeek(Math.max(0, currentTime - 10))
              }}
              onSkipForward={() => {
                showControlsAndResetTimer()
                onSeek(Math.min(duration, currentTime + 10))
              }}
            />

            {/* Bottom Controls - Normal Bar */}
            <Animated.View style={normalBarAnimatedStyle}>
              <YStack accessibilityLabel="Video timeline and controls">
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  bottom={-24}
                  paddingBottom="$2"
                  accessibilityLabel="Video time and controls"
                >
                  <TimeDisplay
                    currentTime={currentTime}
                    duration={duration}
                    testID="time-display"
                  />
                </XStack>
              </YStack>
            </Animated.View>

            {/* Bottom Controls - Persistent Bar */}
            <Animated.View style={persistentBarAnimatedStyle}>
              <YStack accessibilityLabel="Video timeline and controls">
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  bottom={-48}
                  paddingBottom="$2"
                  accessibilityLabel="Video time and controls"
                >
                  <TimeDisplay
                    currentTime={currentTime}
                    duration={duration}
                    testID="time-display-persistent"
                  />
                </XStack>
              </YStack>
            </Animated.View>

            {/* Progress Bar - Normal variant (visible with controls) */}
            <ProgressBar
              variant="normal"
              progress={progress}
              isScrubbing={normalProgressBar.isScrubbing}
              controlsVisible={controlsVisible}
              progressBarWidth={progressBarWidth}
              animatedStyle={normalBarAnimatedStyle}
              combinedGesture={progressBarCombinedGesture}
              mainGesture={mainProgressGesture}
              animationName={getAnimationName(currentInteractionType)}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout
                setProgressBarWidth(width)
              }}
              onFallbackPress={(locationX) => {
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
            />

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

          {/* Persistent Progress Bar - Render inline if callback not provided (for testing) */}
          {/* {!onPersistentProgressBarPropsChange && (
            <ProgressBar
              variant="persistent"
              progress={persistentProgress}
              isScrubbing={persistentProgressBar.isScrubbing}
              controlsVisible={controlsVisible}
              progressBarWidth={persistentProgressBarWidth}
              animatedStyle={persistentBarAnimatedStyle}
              combinedGesture={persistentProgressBarCombinedGesture}
              mainGesture={persistentProgressGesture}
              animationName={getAnimationName(currentInteractionType)}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout
                setPersistentProgressBarWidth(width)
              }}
              onFallbackPress={(locationX) => {
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
            />
          )} */}
        </Pressable>
      )
    }
  )
)
