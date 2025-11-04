import { log } from '@my/logging'
import { ProfilerWrapper } from '@ui/components/Performance'
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
import { XStack, YStack } from 'tamagui'

import { useRenderProfile } from '../../../hooks/useRenderProfile'
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
  // Accept SharedValue/DerivedValue directly to avoid JS re-renders during gestures
  videoMode?: 'max' | 'normal' | 'min' | SharedValue<'max' | 'normal' | 'min'>
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
    const [isAnyScrubbing, setIsAnyScrubbing] = useState(false)
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
      isScrubbing: isAnyScrubbing,
      onControlsVisibilityChange: handleControlsVisibilityChange,
    })

    // Destructure for easier access
    const { controlsVisible, handlePress, showControlsAndResetTimer } = visibility

    // Reanimated shared value for overlay opacity (runs on UI thread)
    const overlayOpacity = useSharedValue(controlsVisible ? 1 : 0)

    // Stable callback for animation completion (called from UI thread)
    const handleAnimationComplete = useCallback(() => {
      // log.debug('VideoControls', '📊 [PERFORMANCE] Animation completed', {
      //   animationName: `controls-overlay-${interactionType}`,
      //   targetValue,
      //   configuredDuration,
      // })
    }, [])

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
            runOnJS(handleAnimationComplete)()
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
    const isVideoModeSharedValue = typeof _videoMode === 'object' && 'value' in _videoMode

    const prevPropsRef = useRef<{
      isPlaying: boolean
      showControls: boolean
      currentTime: number
      controlsVisible: boolean
    } | null>(null)
    const lastRenderTimeRef = useRef<number>(Date.now())

    useEffect(() => {
      const now = Date.now()
      const timeSinceLastRender = now - lastRenderTimeRef.current
      lastRenderTimeRef.current = now

      const prev = prevPropsRef.current
      if (prev) {
        const changed: string[] = []
        if (prev.isPlaying !== isPlaying) changed.push('isPlaying')
        if (prev.showControls !== showControls) changed.push('showControls')
        if (Math.abs(prev.currentTime - currentTime) > 0.1) changed.push('currentTime')
        if (prev.controlsVisible !== controlsVisible) changed.push('controlsVisible')

        if (changed.length === 0 && timeSinceLastRender < 16) {
          log.debug('VideoControls', '⚠️ Rapid re-render without prop changes', {
            timeSinceLastRender,
            isRapid: true,
            stackTrace: new Error().stack?.split('\n').slice(1, 8).join('\n'),
          })
        }
      }

      prevPropsRef.current = {
        isPlaying,
        showControls,
        currentTime,
        controlsVisible,
      }
    })

    useRenderProfile({
      componentName: 'VideoControls',
      enabled: false,
      logInterval: 10,
      trackProps: {
        isPlaying,
        showControls,
        currentTime: Math.floor(currentTime), // Round to reduce re-render noise
        controlsVisible: showControls,
        // Don't read SharedValue.value during render - just indicate type
        videoMode: isVideoModeSharedValue ? '[SharedValue]' : _videoMode,
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

    useEffect(() => {
      if (isScrubbing !== isAnyScrubbing) {
        setIsAnyScrubbing(isScrubbing)
      }
    }, [isScrubbing, isAnyScrubbing])
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
      // Reset auto-hide timer when menu is opened
      showControlsAndResetTimer()
      // Notify parent component that menu was pressed (for external menu integration)
      onMenuPress?.()
    }, [showControlsAndResetTimer, onMenuPress])

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

    // Stable callbacks for persistent progress bar to prevent recreation on every render
    const stableOnLayout = useCallback(
      (event: any) => {
        const { width } = event.nativeEvent.layout
        setPersistentProgressBarWidth(width)
      },
      [setPersistentProgressBarWidth]
    )

    const stableOnFallbackPress = useCallback(
      (locationX: number) => {
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
      [persistentProgressBarWidth, duration, onSeek]
    )

    /**
     * Track previous primitive values to detect when actual data changes.
     *
     * Used to compare incoming values with previous values before creating new props object.
     * This prevents unnecessary object creation and callback invocations when values are unchanged.
     *
     * @see stablePropsObjectRef - stores the actual props object for reference stability
     */
    const prevPersistentProgressRef = useRef<number | null>(null)
    const prevIsScrubbingRef = useRef<boolean | null>(null)
    const prevControlsVisibleRef = useRef<boolean | null>(null)
    const prevProgressBarWidthRef = useRef<number | null>(null)

    /**
     * Store the stable props object to maintain reference equality when values haven't changed.
     *
     * CRITICAL PERFORMANCE FIX: This prevents "MEMO BYPASSED" errors in VideoAnalysisLayout.
     *
     * Problem: Previously, a new object literal was created on every useEffect run, even when
     * primitive values (progress, isScrubbing, controlsVisible, progressBarWidth) were unchanged.
     * This caused VideoAnalysisLayout's arePropsEqual to return true (comparing old props) while
     * React saw new props (from the new object), causing unnecessary re-renders.
     *
     * Solution: Store the props object in this ref. Only create a new object when primitive
     * values actually change. When values are unchanged, don't call the callback at all
     * (parent already has the stable reference). This ensures React.memo can properly detect
     * unchanged props via reference equality.
     *
     * @see prevPersistentProgressRef - tracks primitive values for comparison
     */
    const stablePropsObjectRef = useRef<PersistentProgressBarProps | null>(null)

    /**
     * Store unstable objects in refs to prevent effect from running unnecessarily.
     *
     * These objects (animatedStyle, gestures) change frequently during animations but
     * don't need to trigger parent re-renders. By accessing them via refs, we keep them
     * out of the dependency array while still providing the latest values when creating
     * the props object.
     *
     * Note: currentInteractionTypeRef is already defined earlier in component
     */
    const persistentBarAnimatedStyleRef = useRef(persistentBarAnimatedStyle)
    persistentBarAnimatedStyleRef.current = persistentBarAnimatedStyle
    const persistentProgressBarCombinedGestureRef = useRef(persistentProgressBarCombinedGesture)
    persistentProgressBarCombinedGestureRef.current = persistentProgressBarCombinedGesture
    const persistentProgressGestureRef = useRef(persistentProgressGesture)
    persistentProgressGestureRef.current = persistentProgressGesture

    /**
     * Provide persistent progress bar props to parent via callback for rendering at layout level.
     *
     * PERFORMANCE OPTIMIZATION: This effect ensures reference stability to prevent unnecessary
     * re-renders in VideoAnalysisLayout (which uses React.memo with arePropsEqual).
     *
     * Strategy:
     * 1. Compare primitive values (progress, isScrubbing, controlsVisible, progressBarWidth)
     *    with previous values using refs
     * 2. Only create new props object when primitive values actually change
     * 3. Store the props object in stablePropsObjectRef for future reference stability
     * 4. When values are unchanged, don't call the callback - parent already has stable reference
     *
     * Why this matters:
     * - Creating new objects on every render causes React.memo to fail (reference inequality)
     * - This triggers "MEMO BYPASSED" errors where arePropsEqual returns true but component renders
     * - By maintaining reference stability at source, we prevent these race conditions
     *
     * Dependency strategy:
     * - Only include PRIMITIVE dependencies (persistentProgress, isScrubbing, controlsVisible, width)
     * - Unstable objects (animatedStyle, gestures) accessed via refs, not in dependency array
     * - Stable callbacks (onLayout, onFallbackPress) excluded from dependencies
     *
     * @see stablePropsObjectRef - stores props object for reference stability
     * @see prevPersistentProgressRef - tracks previous values for comparison
     */
    useEffect(() => {
      if (!onPersistentProgressBarPropsChange) {
        return
      }

      /**
       * Check if actual primitive values changed (not object references).
       *
       * Primitive comparison is faster and avoids object equality checks.
       * This ensures we only create new objects when data actually changes.
       */
      const progressChanged = prevPersistentProgressRef.current !== persistentProgress
      const scrubbingChanged = prevIsScrubbingRef.current !== persistentProgressBar.isScrubbing
      const controlsChanged = prevControlsVisibleRef.current !== controlsVisible
      const widthChanged = prevProgressBarWidthRef.current !== persistentProgressBarWidth

      /**
       * Only create and pass new props object when values actually changed.
       *
       * First render always calls (all refs are null) to initialize parent state.
       * Subsequent renders only create new object when primitive values change.
       */
      if (
        prevPersistentProgressRef.current === null ||
        prevIsScrubbingRef.current === null ||
        prevControlsVisibleRef.current === null ||
        prevProgressBarWidthRef.current === null ||
        progressChanged ||
        scrubbingChanged ||
        controlsChanged ||
        widthChanged
      ) {
        // log.debug('VideoControls', '🎯 Calling onPersistentProgressBarPropsChange')

        /**
         * Create new props object only when values change.
         *
         * This maintains reference stability: same object reference = same props = no re-render.
         * When values are unchanged, we don't call the callback at all, so parent keeps existing reference.
         */
        const newPropsObject: PersistentProgressBarProps = {
          progress: persistentProgress,
          isScrubbing: persistentProgressBar.isScrubbing,
          controlsVisible,
          progressBarWidth: persistentProgressBarWidth,
          animatedStyle: persistentBarAnimatedStyleRef.current,
          combinedGesture: persistentProgressBarCombinedGestureRef.current,
          mainGesture: persistentProgressGestureRef.current,
          animationName: getAnimationName(currentInteractionTypeRef.current),
          onLayout: stableOnLayout,
          onFallbackPress: stableOnFallbackPress,
        }

        /**
         * Store props object for reference stability.
         *
         * This ensures we can reuse the same reference in future renders when values
         * haven't changed (though we don't call callback in that case).
         */
        stablePropsObjectRef.current = newPropsObject
        onPersistentProgressBarPropsChange(newPropsObject)

        /**
         * Update tracking refs with current primitive values.
         *
         * Used for comparison in next render to detect value changes.
         */
        prevPersistentProgressRef.current = persistentProgress
        prevIsScrubbingRef.current = persistentProgressBar.isScrubbing
        prevControlsVisibleRef.current = controlsVisible
        prevProgressBarWidthRef.current = persistentProgressBarWidth
      }
      /**
       * Values unchanged - don't call callback.
       *
       * Parent (VideoAnalysisScreen) already has stable reference from previous call.
       * Calling callback would create unnecessary re-render cycle even if we passed same object.
       */

      return () => {
        /**
         * Cleanup: notify parent that persistent progress bar should be removed.
         *
         * Called when component unmounts or when onPersistentProgressBarPropsChange
         * prop changes (e.g., parent re-renders with new callback reference).
         */
        onPersistentProgressBarPropsChange(null)
      }
    }, [
      /**
       * Dependency array strategy:
       *
       * Only include PRIMITIVE dependencies - these are the actual values that determine
       * whether props object should be recreated.
       *
       * Excluded from dependencies (accessed via refs or stable references):
       * - persistentBarAnimatedStyle - changes frequently, accessed via persistentBarAnimatedStyleRef
       * - persistentProgressBarCombinedGesture - changes frequently, accessed via ref
       * - persistentProgressGesture - changes frequently, accessed via ref
       * - currentInteractionType - changes frequently, accessed via currentInteractionTypeRef
       * - stableOnLayout - stable callback reference
       * - stableOnFallbackPress - stable callback reference
       * - getAnimationName - stable function reference
       * - duration, onSeek, showControlsAndResetTimer - stable values
       */
      persistentProgress,
      persistentProgressBar.isScrubbing,
      controlsVisible,
      persistentProgressBarWidth,
      onPersistentProgressBarPropsChange,
    ])

    return (
      <ProfilerWrapper
        id="VideoControls"
        logToConsole={__DEV__}
      >
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
      </ProfilerWrapper>
    )
  }
)
