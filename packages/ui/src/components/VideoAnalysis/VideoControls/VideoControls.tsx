import { log } from '@my/logging'
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'

// PERFORMANCE FIX: Props-based state to avoid ui->app dependency
// VideoControls receives state as props to maintain UI/business logic separation
import { Pressable, type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
  type AnimatedStyle,
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
import { useProgressBarGesture } from './hooks/useProgressBarGesture'
import { useProgressBarVisibility } from './hooks/useProgressBarVisibility'
import { isSharedValue, sanitizeCollapseProgress } from './utils/collapseProgress'

export interface VideoControlsRef {
  triggerMenu: () => void
}

export interface PersistentProgressBarProps {
  currentTime: number
  duration: number
  isScrubbing: boolean
  controlsVisible: boolean
  shouldRenderPersistent: boolean
  pointerEvents: 'auto' | 'none'
  visibility: SharedValue<number>
  animatedStyle: AnimatedStyle<ViewStyle>
  combinedGesture: any
  mainGesture: any
  onLayout: (event: any) => void
  onFallbackPress: (locationX: number) => void
  progressShared?: SharedValue<number>
  progressBarWidthShared?: SharedValue<number>
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
  /** Optional shared overscroll offset (negative when pulling past top). Used to hide bars during pull-to-expand gestures. */
  overscroll?: SharedValue<number>
  // DEPRECATED: Use persistentProgressStoreSetter instead to prevent cascading re-renders
  // Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
  // NEW: Store setter for persistent progress bar props (preferred over callback)
  // Prevents cascading re-renders by writing directly to Zustand store instead of parent state
  persistentProgressStoreSetter?: (props: PersistentProgressBarProps | null) => void
  /** Shared progress percentage updated by `useVideoPlayer` for UI-thread sync */
  persistentProgressShared?: SharedValue<number>
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
      overscroll,
      onPersistentProgressBarPropsChange,
      persistentProgressStoreSetter,
      persistentProgressShared,
    },
    ref
  ) => {
    const [isAnyScrubbing, setIsAnyScrubbing] = useState(false)
    const progressBarWidthShared = useSharedValue(300)
    const persistentProgressBarWidthShared = useSharedValue(300)
    // Shared scrubbing state across both progress bars to prevent simultaneous activation
    const globalScrubbingShared = useSharedValue(false)

    // Conditional animation timing hook
    const { getAnimationDuration } = useConditionalAnimationTiming()

    // Consolidated animation state - derive interaction type from props to reduce state updates
    const currentInteractionTypeRef = useRef<AnimationInteractionType>('user-tap')

    // Derive interaction type from current props (no state updates needed)
    // Note: currentInteractionType is computed on demand, not stored

    // Handle collapseProgress: accept SharedValue directly or convert number to SharedValue
    // If SharedValue is passed, use it directly (no re-renders during gestures)
    // If number is passed (legacy/fallback), create a SharedValue and sync it

    // Track collapseProgress via refs to avoid React dependency comparison accessing .value
    const collapseProgressRef = useRef(collapseProgress)
    const isSharedValuePropRef = useRef(isSharedValue(collapseProgress))

    // State for tracking primitive number changes (for syncing to internal SharedValue)
    const [collapseProgressNumber, setCollapseProgressNumber] = useState<number | null>(
      typeof collapseProgress === 'number' ? sanitizeCollapseProgress(collapseProgress) : null
    )

    // Update refs and state when collapseProgress prop changes
    const prevIsSharedValue = isSharedValuePropRef.current
    const isSharedValueNow = isSharedValue(collapseProgress)

    if (
      collapseProgressRef.current !== collapseProgress ||
      prevIsSharedValue !== isSharedValueNow
    ) {
      collapseProgressRef.current = collapseProgress
      isSharedValuePropRef.current = isSharedValueNow

      // Sync number values to state for effect dependency
      if (typeof collapseProgress === 'number') {
        const sanitized = sanitizeCollapseProgress(collapseProgress)
        if (collapseProgressNumber !== sanitized) {
          setCollapseProgressNumber(sanitized)
        }
      } else if (collapseProgressNumber !== null) {
        setCollapseProgressNumber(null)
      }
    }

    const isSharedValueProp = isSharedValuePropRef.current

    // Create internal SharedValue for number props only
    // If collapseProgress is a SharedValue, we'll use it directly (no internal SharedValue needed)
    const collapseProgressShared = useSharedValue(0) // Initialize with 0, will sync for number props

    // Sync prop changes - only sync if collapseProgress is a number (not a SharedValue)
    // If it's a SharedValue, we use it directly in useMemo below (no sync needed)
    // CRITICAL: Use primitive number value in deps (not SharedValue) to avoid React accessing .value
    // React's dependency comparison on SharedValue might access .value during render
    useEffect(() => {
      if (!isSharedValueProp && collapseProgressNumber !== null) {
        collapseProgressShared.value = collapseProgressNumber
      }
      // If it's a SharedValue prop, no sync needed - use it directly via isSharedValueProp
    }, [isSharedValueProp, collapseProgressNumber, collapseProgressShared])
    // Note: Using collapseProgressNumber (primitive state) instead of collapseProgress
    // This prevents React from comparing SharedValue objects (which might access .value)

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
      // Animation complete - no logging in production
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
      // const timeSinceLastRender = now - lastRenderTimeRef.current
      lastRenderTimeRef.current = now

      const prev = prevPropsRef.current
      if (prev) {
        const changed: string[] = []
        if (prev.isPlaying !== isPlaying) changed.push('isPlaying')
        if (prev.showControls !== showControls) changed.push('showControls')
        if (Math.abs(prev.currentTime - currentTime) > 0.1) changed.push('currentTime')
        if (prev.controlsVisible !== controlsVisible) changed.push('controlsVisible')

        // if (changed.length === 0 && timeSinceLastRender < 16) {
        //   log.debug('VideoControls', '⚠️ Rapid re-render without prop changes', {
        //     timeSinceLastRender,
        //     isRapid: true,
        //     stackTrace: new Error().stack?.split('\n').slice(1, 8).join('\n'),
        //   })
        // }
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

    // Guard against NaN/Infinity values to prevent render loops
    const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0

    // Progress bar gesture hooks for normal and persistent bars
    const normalProgressBar = useProgressBarGesture({
      barType: 'normal',
      duration: safeDuration,
      currentTime: safeCurrentTime,
      progressBarWidthShared,
      onSeek,
      showControlsAndResetTimer,
      globalScrubbingShared,
      trackLeftInset: 0, // Normal bar has no left inset
    })

    const persistentProgressBar = useProgressBarGesture({
      barType: 'persistent',
      duration: safeDuration,
      currentTime: safeCurrentTime,
      progressBarWidthShared: persistentProgressBarWidthShared,
      onSeek,
      showControlsAndResetTimer,
      globalScrubbingShared,
      trackLeftInset: 0, // Persistent bar track starts at 0; handle padding handled separately
      enableScrubbingTelemetry: false,
      progressSharedOverride: persistentProgressShared,
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
          : safeDuration > 0
            ? Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100))
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
    // CRITICAL: Access collapseProgress via ref to avoid React dependency comparison
    // that might access .value during render, causing Reanimated warnings.
    const collapseProgressSharedValue = useMemo(() => {
      // Use the prop directly if it's a SharedValue (checked via isSharedValueProp)
      // Otherwise use our internal synced SharedValue
      const currentCollapseProgress = collapseProgressRef.current
      if (isSharedValueProp && typeof currentCollapseProgress === 'object') {
        return currentCollapseProgress as SharedValue<number>
      }
      return collapseProgressShared
    }, [isSharedValueProp, collapseProgressShared])
    // Note: collapseProgress accessed via ref to prevent Reanimated warning
    // When collapseProgress is a SharedValue, reference is stable (no need to track in deps)
    // When collapseProgress is a number, it's synced to collapseProgressShared via useEffect

    const {
      shouldRenderPersistent,
      normalVisibility,
      persistentVisibility,
      normalVisibilityAnimatedStyle,
      persistentVisibilityAnimatedStyle,
    } = useProgressBarVisibility(collapseProgressSharedValue, overscroll, overlayOpacity)
    // Initialize pointer events based on actual visibility values (0 or 1 depending on mode)
    // Both bars are always rendered (v3: absolute positioning), so pointer events must be
    // disabled when a bar is not visible (visibility <= 0.01) to prevent touch interference
    const [normalBarPointerEvents, setNormalBarPointerEvents] = useState<'auto' | 'none'>(
      normalVisibility.value > 0.01 ? 'auto' : 'none'
    )
    const [persistentBarPointerEvents, setPersistentBarPointerEvents] = useState<'auto' | 'none'>(
      persistentVisibility.value > 0.01 ? 'auto' : 'none'
    )

    const updateNormalPointerEvents = useCallback((visible: boolean) => {
      setNormalBarPointerEvents(visible ? 'auto' : 'none')
    }, [])

    const updatePersistentPointerEvents = useCallback((visible: boolean) => {
      setPersistentBarPointerEvents(visible ? 'auto' : 'none')
    }, [])

    useAnimatedReaction(
      () => normalVisibility.value > 0.01,
      (next, previous) => {
        if (next === previous) {
          return
        }
        runOnJS(updateNormalPointerEvents)(next)
      },
      [normalVisibility, updateNormalPointerEvents]
    )

    useAnimatedReaction(
      () => persistentVisibility.value > 0.01,
      (next, previous) => {
        if (next === previous) {
          return
        }
        runOnJS(updatePersistentPointerEvents)(next)
      },
      [persistentVisibility, updatePersistentPointerEvents]
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
    /**
     * Store unstable objects in refs to prevent effect from running unnecessarily.
     *
     * These objects (animatedStyle, gestures) change frequently during animations but
     * don't need to trigger parent re-renders. By accessing them via refs, we keep them
     * out of the dependency array while still providing the latest values when creating
     * the props object.
     *
     * CRITICAL: Gestures are intentionally-unstable objects (Reanimated creates new instances).
     * We access them via refs to avoid dependency changes, but ignore gesture-only updates
     * in the effect (only update when primitives change).
     *
     * Note: currentInteractionTypeRef is already defined earlier in component
     */
    const persistentProgressBarRefs = useMemo(
      () => ({
        combinedGesture: persistentProgressBarCombinedGesture,
        mainGesture: persistentProgressGesture,
        progressBarWidth: persistentProgressBarWidth,
        duration,
      }),
      [
        persistentProgressBarCombinedGesture,
        persistentProgressGesture,
        persistentProgressBarWidth,
        duration,
      ]
    )

    const persistentProgressBarCombinedGestureRef = useRef(
      persistentProgressBarRefs.combinedGesture
    )
    const persistentProgressGestureRef = useRef(persistentProgressBarRefs.mainGesture)
    const persistentProgressBarWidthRef = useRef(persistentProgressBarRefs.progressBarWidth)
    const persistentDurationRef = useRef(persistentProgressBarRefs.duration)

    useEffect(() => {
      persistentProgressBarCombinedGestureRef.current = persistentProgressBarRefs.combinedGesture
      persistentProgressGestureRef.current = persistentProgressBarRefs.mainGesture
      persistentProgressBarWidthRef.current = persistentProgressBarRefs.progressBarWidth
      persistentDurationRef.current = persistentProgressBarRefs.duration
    }, [persistentProgressBarRefs])

    const stableOnLayout = useCallback(
      (event: any) => {
        const { width } = event.nativeEvent.layout
        setPersistentProgressBarWidth(width)
      },
      [setPersistentProgressBarWidth]
    )

    const stableOnFallbackPress = useCallback(
      (locationX: number) => {
        const currentWidth = persistentProgressBarWidthRef.current
        const currentDuration = persistentDurationRef.current
        if (currentWidth > 0 && currentDuration > 0) {
          const seekPercentage = Math.max(0, Math.min(100, (locationX / currentWidth) * 100))
          const seekTime = (seekPercentage / 100) * currentDuration
          log.debug('VideoControls', 'Persistent fallback press handler - RAW CALCULATION', {
            locationX,
            persistentProgressBarWidth: currentWidth,
            seekPercentage,
            expectedSeekTime: seekTime,
            duration: currentDuration,
          })
          onSeek(seekTime)
        }
      },
      [onSeek]
    )

    const combinedPersistentSetter = useMemo(() => {
      return persistentProgressStoreSetter ?? onPersistentProgressBarPropsChange ?? null
    }, [persistentProgressStoreSetter, onPersistentProgressBarPropsChange])

    // PERF FIX: Use useLayoutEffect to set props synchronously before paint
    // This ensures PersistentProgressBar renders on the first frame, not after a delay
    // The store starts with props: null, so the progress bar won't render until this runs
    // Using useEffect caused a visible delay where the bar appeared ~100ms after navigation
    useLayoutEffect(() => {
      if (!combinedPersistentSetter) {
        return
      }

      combinedPersistentSetter({
        currentTime: safeCurrentTime,
        duration: safeDuration,
        isScrubbing: persistentProgressBar.isScrubbing,
        controlsVisible,
        shouldRenderPersistent,
        pointerEvents: persistentBarPointerEvents,
        visibility: persistentVisibility,
        animatedStyle: persistentVisibilityAnimatedStyle,
        combinedGesture: persistentProgressBarCombinedGestureRef.current,
        mainGesture: persistentProgressGestureRef.current,
        onLayout: stableOnLayout,
        onFallbackPress: stableOnFallbackPress,
        progressShared: persistentProgressBar.progressShared,
        progressBarWidthShared: persistentProgressBarWidthShared,
      })
    }, [
      combinedPersistentSetter,
      safeCurrentTime,
      safeDuration,
      persistentProgressBar.isScrubbing,
      controlsVisible,
      shouldRenderPersistent,
      persistentBarPointerEvents,
      persistentVisibility,
      persistentVisibilityAnimatedStyle,
      persistentProgressBar.progressShared,
      persistentProgressBarWidthShared,
      stableOnLayout,
      stableOnFallbackPress,
      persistentProgressBarCombinedGesture,
      persistentProgressGesture,
    ])

    // Cleanup: Reset store on unmount (synchronous to match setup)
    useLayoutEffect(() => {
      if (!combinedPersistentSetter) {
        return
      }

      return () => {
        combinedPersistentSetter(null)
      }
    }, [combinedPersistentSetter])

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
              currentTime={safeCurrentTime}
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
                onSeek(Math.max(0, safeCurrentTime - 10))
              }}
              onSkipForward={() => {
                showControlsAndResetTimer()
                onSeek(Math.min(safeDuration, safeCurrentTime + 10))
              }}
            />

            {/* TimeDisplay - Max mode (higher position) */}
            <Animated.View
              pointerEvents={normalBarPointerEvents}
              style={[
                { position: 'absolute', left: 0, right: 0, bottom: 42 },
                normalVisibilityAnimatedStyle,
              ]}
            >
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingBottom="$2"
                accessibilityLabel="Video time and controls"
              >
                <TimeDisplay
                  currentTime={safeCurrentTime}
                  duration={safeDuration}
                  testID="time-display"
                />
              </XStack>
            </Animated.View>

            {/* TimeDisplay - Normal/Min mode (lower position) */}
            <Animated.View
              pointerEvents={persistentBarPointerEvents}
              style={[
                { position: 'absolute', left: 0, right: 0, bottom: 0 },
                persistentVisibilityAnimatedStyle,
              ]}
            >
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingBottom="$1.5"
                accessibilityLabel="Video time and controls"
              >
                <TimeDisplay
                  currentTime={currentTime}
                  duration={duration}
                  testID="time-display-persistent"
                />
              </XStack>
            </Animated.View>

            {/* Progress Bar - Normal variant */}
            <ProgressBar
              variant="normal"
              progress={progress}
              isScrubbing={normalProgressBar.isScrubbing}
              controlsVisible={controlsVisible}
              animatedStyle={normalVisibilityAnimatedStyle}
              pointerEvents={normalBarPointerEvents}
              progressShared={normalProgressBar.progressShared}
              progressBarWidthShared={progressBarWidthShared}
              combinedGesture={progressBarCombinedGesture}
              mainGesture={mainProgressGesture}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout
                setProgressBarWidth(width)
              }}
              onFallbackPress={(locationX) => {
                if (progressBarWidth > 0 && duration > 0) {
                  // Normal bar has no left inset (0px)
                  const relativeX = Math.max(0, locationX - 0)
                  const correctedSeekPercentage = Math.max(
                    0,
                    Math.min(100, (relativeX / progressBarWidth) * 100)
                  )
                  const seekTime = (correctedSeekPercentage / 100) * duration
                  log.debug('VideoControls', 'Normal fallback press handler - RAW CALCULATION', {
                    locationX,
                    progressBarWidth,
                    seekPercentage: correctedSeekPercentage,
                    expectedSeekTime: seekTime,
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
      </Pressable>
    )
  }
)

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(VideoControls as any).whyDidYouRender = true
}
