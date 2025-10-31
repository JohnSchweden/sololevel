import { log } from '@my/logging'
import { Download, Share } from '@tamagui/lucide-icons'
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import { Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  cancelAnimation,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated'
import { Text, XStack, YStack } from 'tamagui'

import { useRenderProfile } from '../../../hooks/useRenderProfile'
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
  // Accept SharedValue directly to avoid JS re-renders during gestures
  collapseProgress?: SharedValue<number> | number
  // NEW: Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
}

export const VideoControls = forwardRef<VideoControlsRef, VideoControlsProps>(
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
    // Shared scrubbing state across both progress bars to prevent simultaneous activation
    const globalScrubbingShared = useSharedValue(false)

    // Conditional animation timing hook
    const { getAnimationName, getAnimationDuration } = useConditionalAnimationTiming()

    // Consolidated animation state - derive interaction type from props to reduce state updates
    const currentInteractionTypeRef = useRef<AnimationInteractionType>('user-tap')

    // Derive interaction type from current props (no state updates needed)
    const currentInteractionType = useMemo(() => {
      if (videoEnded) return 'playback-end'
      return currentInteractionTypeRef.current
    }, [videoEnded])

    // Handle collapseProgress: accept SharedValue directly or convert number to SharedValue
    // If SharedValue is passed, use it directly (no re-renders during gestures)
    // If number is passed (legacy/fallback), create a SharedValue and sync it

    // Check if collapseProgress is a SharedValue without reading .value (avoids Reanimated warning)
    // Only check object structure, don't access .value during render
    const isSharedValueProp = useMemo(() => {
      // SharedValues have a 'value' property and are objects
      // Check structure only, don't read .value during render
      return (
        typeof collapseProgress === 'object' &&
        collapseProgress !== null &&
        'value' in collapseProgress &&
        !Array.isArray(collapseProgress)
      )
    }, [collapseProgress])

    // Create internal SharedValue for number props only
    // If collapseProgress is a SharedValue, we'll use it directly (no internal SharedValue needed)
    const collapseProgressShared = useSharedValue(0) // Initialize with 0, will sync for number props

    // Sync prop changes - only sync if collapseProgress is a number (not a SharedValue)
    // If it's a SharedValue, we use it directly in useMemo below (no sync needed)
    useEffect(() => {
      if (!isSharedValueProp && typeof collapseProgress === 'number') {
        collapseProgressShared.value = collapseProgress
      }
      // If it's a SharedValue prop, no sync needed - use it directly via isSharedValueProp
    }, [collapseProgress, collapseProgressShared, isSharedValueProp])

    // Cleanup shared values on unmount to prevent memory corruption
    // This prevents Reanimated worklets from accessing freed memory during shadow tree cloning
    useEffect(() => {
      return () => {
        // Cancel any pending animations on these shared values
        // This ensures worklets don't try to update values after component unmounts
        cancelAnimation(progressBarWidthShared)
        cancelAnimation(persistentProgressBarWidthShared)
        // Only cancel animation on collapseProgressShared if we created it (not if it was passed as prop)
        // Use isSharedValueProp to avoid reading .value during cleanup
        if (!isSharedValueProp) {
          cancelAnimation(collapseProgressShared)
        }
        cancelAnimation(globalScrubbingShared)
      }
    }, [
      progressBarWidthShared,
      persistentProgressBarWidthShared,
      collapseProgressShared,
      globalScrubbingShared,
      collapseProgress,
      isSharedValueProp,
    ])

    // Wrapped callback to track interaction type for conditional animation timing
    const handleControlsVisibilityChange = useCallback(
      (visible: boolean, isUserInteraction?: boolean) => {
        // Update interaction type ref (no state update = no re-render)
        if (isUserInteraction) {
          currentInteractionTypeRef.current = 'user-tap'
        } else if (!visible) {
          currentInteractionTypeRef.current = 'auto-hide'
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

    // Reanimated shared value for overlay opacity (runs on UI thread)
    const overlayOpacity = useSharedValue(controlsVisible ? 1 : 0)

    // Stable callback for animation completion (called from UI thread)
    const handleAnimationComplete = useCallback(
      (configuredDuration: number, targetValue: number) => {
        const interactionType = currentInteractionTypeRef.current

        log.debug('VideoControls', '📊 [PERFORMANCE] Animation completed', {
          animationName: `controls-overlay-${interactionType}`,
          targetValue,
          configuredDuration,
        })
      },
      [] // Stable - use refs for dynamic values
    )

    // Update overlay opacity animation when visibility changes
    useEffect(() => {
      cancelAnimation(overlayOpacity)
      const duration = getAnimationDuration(currentInteractionTypeRef.current)
      const targetValue = controlsVisible ? 1 : 0

      overlayOpacity.value = withTiming(
        targetValue,
        {
          duration,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          'worklet'
          if (finished) {
            runOnJS(handleAnimationComplete)(duration, targetValue)
          }
        }
      )
    }, [controlsVisible, handleAnimationComplete])

    // Animated style for overlay (runs on UI thread)
    const overlayAnimatedStyle = useAnimatedStyle(() => {
      return {
        opacity: overlayOpacity.value,
      }
    })

    // Render profiling - enable in dev only
    useRenderProfile({
      componentName: 'VideoControls',
      enabled: __DEV__,
      logInterval: 10,
      trackProps: {
        isPlaying,
        showControls,
        currentTime: Math.floor(currentTime), // Round to reduce re-render noise
        controlsVisible: showControls,
        videoMode: _videoMode,
        // Don't read SharedValue.value during render - just indicate type
        collapseProgress: isSharedValueProp ? '[SharedValue]' : collapseProgress,
      },
    })

    // Progress bar gesture hooks for normal and persistent bars
    const normalProgressBar = useProgressBarGesture({
      barType: 'normal',
      duration,
      currentTime,
      progressBarWidthShared,
      onSeek,
      showControlsAndResetTimer,
      globalScrubbingShared,
    })

    const persistentProgressBar = useProgressBarGesture({
      barType: 'persistent',
      duration,
      currentTime,
      progressBarWidthShared: persistentProgressBarWidthShared,
      onSeek,
      showControlsAndResetTimer,
      globalScrubbingShared,
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
    // Use the SharedValue directly - if collapseProgress prop was a SharedValue, use it;
    // otherwise use the synced SharedValue we created
    const collapseProgressForAnimation = useMemo(() => {
      // Use the prop directly if it's a SharedValue (checked via isSharedValueProp)
      // Otherwise use our internal synced SharedValue
      if (isSharedValueProp && typeof collapseProgress === 'object') {
        return collapseProgress as SharedValue<number>
      }
      return collapseProgressShared
    }, [isSharedValueProp, collapseProgress, collapseProgressShared])

    const { persistentBarAnimatedStyle, normalBarAnimatedStyle } = useProgressBarAnimation(
      collapseProgressForAnimation
    )

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
            // Note: showControlsAndResetTimer() is handled by gesture handler's onStart
            // Fallback should only seek, not show controls (gesture handles that)
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
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'flex-end',
              padding: 16,
            },
            overlayAnimatedStyle,
          ]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <YStack
            flex={1}
            justifyContent="flex-end"
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
                  // Note: showControlsAndResetTimer() is handled by gesture handler's onStart
                  // Fallback should only seek, not show controls (gesture handles that)
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
        </Animated.View>

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
                  // Note: showControlsAndResetTimer() is handled by gesture handler's onStart
                  // Fallback should only seek, not show controls (gesture handles that)
                }
              }}
            />
          )} */}
      </Pressable>
    )
  }
)
