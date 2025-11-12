// import { log } from '@my/logging'
import React, { useCallback, useEffect } from 'react'
import { type LayoutChangeEvent, Pressable, View, type ViewStyle } from 'react-native'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import Animated, {
  type AnimatedStyle,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { YStack, useTheme } from 'tamagui'

/**
 * Props for the ProgressBar component
 *
 * @property variant - Visual variant: 'normal' (larger, visible with controls) or 'persistent' (smaller, always visible)
 * @property progress - Current progress percentage (0-100)
 * @property isScrubbing - Whether user is currently scrubbing this progress bar
 * @property controlsVisible - Whether video controls are visible (affects styling)
 * @property animatedStyle - Reanimated style for fade in/out animations
 * @property combinedGesture - Combined gesture handler for track (tap + pan)
 * @property mainGesture - Main gesture handler for scrubber handle (pan)
 * @property onLayout - Layout event handler to measure progress bar width
 * @property onFallbackPress - Fallback press handler when gesture fails (receives locationX)
 * @property testID - Optional test identifier for the progress bar container
 * @property animationName - Tamagui animation name for conditional timing (e.g., 'quick', 'lazy')
 */
export interface ProgressBarProps {
  /** Visual variant: 'normal' (larger, visible with controls) or 'persistent' (smaller, always visible) */
  variant: 'normal' | 'persistent'
  /** Current progress percentage (0-100) */
  progress: number
  /** Whether user is currently scrubbing this progress bar */
  isScrubbing: boolean
  /** Whether video controls are visible (affects styling) */
  controlsVisible: boolean
  /** Optional animated style for backward compatibility */
  animatedStyle?: AnimatedStyle<ViewStyle>
  /** Combined gesture handler for track (tap + pan) */
  combinedGesture: GestureType
  /** Main gesture handler for scrubber handle (pan) */
  mainGesture: GestureType
  /** Layout event handler to measure progress bar width */
  onLayout: (event: LayoutChangeEvent) => void
  /** Fallback press handler when gesture fails (receives locationX) */
  onFallbackPress: (locationX: number) => void
  /** Optional test identifier for the progress bar container */
  testID?: string
  /** Pointer events passthrough so callers can disable interactions while hidden */
  pointerEvents?: 'auto' | 'none'
  /**
   * Optional shared progress percentage (0-100). When provided, the progress bar visuals
   * animate directly from this shared value instead of React props, eliminating React renders
   * during scrubbing/playback and keeping the handle perfectly in sync with GPU-driven updates.
   */
  progressShared?: SharedValue<number>
  /**
   * Optional shared track width (in px). Typically provided by `useProgressBarGesture`.
   * Required when using `progressShared` so the fill/handle can derive absolute width.
   */
  progressBarWidthShared?: SharedValue<number>
}

/**
 * ProgressBar Component
 *
 * Consolidated progress bar component that eliminates duplication between normal and persistent variants.
 * Supports two visual variants:
 * - **normal**: Larger progress bar (4px height, 14px handle) shown with main video controls
 * - **persistent**: Smaller progress bar (2px height, 10px handle) always visible at bottom
 *
 * ### Shared progress value contract
 * When callers provide `progressShared`, the component reads the shared value inside Reanimated worklets
 * (`useAnimatedStyle`) to keep the fill/handle perfectly aligned with UI-thread updates (e.g., during fast seeks
 * or coordinator-driven highlights). The `progress` prop remains as a fallback for environments without shared
 * values (e.g., tests, storybook) and should be considered secondary — it does **not** drive animations when
 * `progressShared` exists.
 *
 * @example
 * ```tsx
 * <ProgressBar
 *   variant="normal"
 *   progress={50}
 *   isScrubbing={false}
 *   controlsVisible={true}
 *   animatedStyle={normalBarAnimatedStyle}
 *   combinedGesture={normalGesture.combinedGesture}
 *   mainGesture={normalGesture.mainGesture}
 *   onLayout={handleLayout}
 *   onFallbackPress={handlePress}
 * />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = React.memo(
  ({
    variant,
    progress,
    isScrubbing,
    controlsVisible,
    animatedStyle,
    combinedGesture,
    mainGesture,
    onLayout,
    onFallbackPress,
    testID,
    pointerEvents,
    progressShared,
    progressBarWidthShared,
  }) => {
    // Get theme to resolve Tamagui color tokens for React Native Animated.View
    const theme = useTheme()

    // Fallback shared values when caller doesn't supply shared progress/width.
    const fallbackProgressShared = useSharedValue(progress)
    useEffect(() => {
      fallbackProgressShared.value = progress
    }, [fallbackProgressShared, progress])

    const fallbackWidthShared = useSharedValue(0)

    const effectiveProgressShared = progressShared ?? fallbackProgressShared
    const effectiveWidthShared = progressBarWidthShared ?? fallbackWidthShared
    const handleTrackLayout = useCallback(
      (event: LayoutChangeEvent) => {
        fallbackWidthShared.value = event.nativeEvent.layout.width
        onLayout(event)
      },
      [fallbackWidthShared, onLayout]
    )

    // Variant-specific dimensions
    const isNormal = variant === 'normal'
    const trackHeight = isNormal ? 4 : 2
    const handleSize = 12 // Same size for both normal and persistent variants
    const handleTouchArea = 44 // Consistent 44px touch area for both variants
    const handleTopOffset = isNormal ? -20 : -21 // Center within touch area
    const handleMarginLeft = isNormal ? -22 : -22 // Center the touch area

    // Variant-specific colors (Tamagui tokens)
    const trackBackgroundColor = isNormal ? '$color3' : '$color9'
    const fillColor = isNormal ? '$teal9' : controlsVisible ? '$teal9' : '$color11'
    const handleColorToken = isNormal
      ? isScrubbing
        ? '$teal10'
        : '$teal9'
      : controlsVisible
        ? isScrubbing
          ? '$teal10'
          : '$teal9'
        : 'transparent'

    // Resolve color token to actual color value for React Native Animated.View
    // Remove '$' prefix and access theme property
    const resolveThemeColor = (token: string, fallback: string): string => {
      if (!token.startsWith('$')) {
        return token
      }
      const key = token.slice(1) as keyof typeof theme
      const value = theme[key]?.val
      return typeof value === 'string' ? value : fallback
    }

    const fillColorValue = resolveThemeColor(fillColor, fillColor)
    const handleColor = resolveThemeColor(handleColorToken, handleColorToken)

    // Calculate target opacity and scale based on state
    // Persistent bar visibility is independent of controlsVisible (only affected by scrubbing)
    const handleOpacity = isNormal
      ? controlsVisible || isScrubbing
        ? 1
        : 0.7
      : isScrubbing
        ? 1
        : 1 // Slightly dimmed but always visible for persistent bar

    const handleScale = isNormal ? (controlsVisible || isScrubbing ? 1 : 0.3) : 1

    // Round progress percentage for accessibility
    const progressPercentage = Math.round(progress)

    // Variant-specific container positioning
    const containerBottom = isNormal ? 8 : -21
    const containerHeight = isNormal ? 44 : 44 // Both use 44px touch area

    // Variant-specific test IDs
    const containerTestID =
      testID || (isNormal ? 'progress-bar-container' : 'persistent-progress-bar')
    const trackTestID = isNormal ? 'progress-track' : testID || 'persistent-progress-bar'
    const fillTestID = isNormal ? 'progress-fill' : 'persistent-progress-fill'
    const handleTestID = isNormal ? 'scrubber-handle' : 'persistent-scrubber-handle'
    const pressableTestID = isNormal
      ? 'progress-bar-pressable'
      : 'persistent-progress-bar-pressable'

    const containerStyles: Array<ViewStyle | AnimatedStyle<ViewStyle>> = [
      {
        position: isNormal ? 'relative' : 'absolute',
        bottom: containerBottom,
        left: 0,
        right: 0,
        height: containerHeight,
        justifyContent: 'center',
        zIndex: isNormal ? 30 : undefined,
      },
    ]

    if (animatedStyle) {
      containerStyles.push(animatedStyle)
    }

    const containerPointerEvents = pointerEvents ?? 'auto'

    // CRITICAL: Do NOT include effectiveProgressShared/effectiveWidthShared in deps.
    // Reanimated worklets capture shared value references directly—adding them to deps
    // forces React to recreate the worklet on every identity change, triggering commits.
    // This defeats UI-thread synchronization and reintroduces 300ms lag.
    const fillAnimatedStyle = useAnimatedStyle(() => {
      const trackWidth = Math.max(0, effectiveWidthShared.value)
      const progressPercent = Math.max(0, Math.min(100, effectiveProgressShared.value))
      const width = trackWidth > 0 ? (trackWidth * progressPercent) / 100 : 0
      return {
        width: Math.max(0, Math.min(trackWidth, width)),
      }
    })

    const handleContainerAnimatedStyle = useAnimatedStyle(() => {
      const trackWidth = Math.max(0, effectiveWidthShared.value)
      const progressPercent = Math.max(0, Math.min(100, effectiveProgressShared.value))
      const handleRadius = handleSize / 2
      const effectiveWidth = Math.max(trackWidth, handleRadius * 2)
      const targetCenter = (effectiveWidth * progressPercent) / 100
      const clampedCenter = Math.max(
        handleRadius,
        Math.min(effectiveWidth - handleRadius, targetCenter)
      )
      return {
        transform: [{ translateX: clampedCenter }],
      }
    })

    return (
      <Animated.View
        style={containerStyles}
        pointerEvents={containerPointerEvents}
      >
        {isNormal ? (
          // Normal variant: Wrapped in YStack for container structure
          <YStack
            height={44}
            justifyContent="center"
            testID={containerTestID}
            data-testid={containerTestID}
          >
            <GestureDetector gesture={combinedGesture}>
              <Pressable
                onPress={(event) => {
                  const { locationX } = event.nativeEvent
                  onFallbackPress(locationX)
                }}
                style={{ flex: 1 }}
                testID={pressableTestID}
                data-testid={pressableTestID}
              >
                <YStack
                  height={44}
                  backgroundColor="transparent"
                  borderRadius={2}
                  position="relative"
                  testID={trackTestID}
                  data-testid={trackTestID}
                  justifyContent="center"
                  onLayout={handleTrackLayout}
                >
                  {/* Visual progress track */}
                  <YStack
                    height={trackHeight}
                    backgroundColor={trackBackgroundColor}
                    borderRadius={2}
                    position="relative"
                  >
                    {/* Completed progress fill */}
                    <Animated.View
                      style={[
                        {
                          height: '100%',
                          backgroundColor: fillColorValue,
                          borderRadius: 2,
                          position: 'absolute',
                          left: 0,
                          top: 0,
                        } as ViewStyle,
                        fillAnimatedStyle,
                      ]}
                      testID={fillTestID}
                      data-testid={fillTestID}
                    />

                    {/* Scrubber handle */}
                    <GestureDetector gesture={mainGesture}>
                      <Animated.View
                        style={[
                          {
                            position: 'absolute',
                            left: 0,
                            top: handleTopOffset,
                            width: handleTouchArea,
                            height: handleTouchArea,
                            marginLeft: handleMarginLeft,
                            zIndex: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          } as ViewStyle,
                          handleContainerAnimatedStyle,
                        ]}
                      >
                        <View
                          style={{
                            width: handleSize,
                            height: handleSize,
                            backgroundColor: handleColor,
                            borderRadius: handleSize / 2,
                            borderWidth: 0,
                            borderColor: '$color12',
                            elevation: isScrubbing ? 2 : 0,
                            opacity: handleOpacity,
                            transform: [{ scale: handleScale }],
                          }}
                          testID={handleTestID}
                          data-testid={handleTestID}
                          pointerEvents={handleOpacity > 0.01 ? 'auto' : 'none'}
                        />
                      </Animated.View>
                    </GestureDetector>
                  </YStack>
                </YStack>
              </Pressable>
            </GestureDetector>
          </YStack>
        ) : (
          // Persistent variant: Direct pressable wrapper
          <GestureDetector gesture={combinedGesture}>
            <Pressable
              onPress={(event) => {
                const { locationX } = event.nativeEvent
                onFallbackPress(locationX)
              }}
              style={{ flex: 1 }}
              testID={pressableTestID}
              data-testid={pressableTestID}
            >
              <YStack
                height={44}
                backgroundColor="transparent"
                opacity={0.8}
                testID={trackTestID}
                data-testid={trackTestID}
                accessibilityLabel={`Video progress: ${progressPercentage}% complete`}
                accessibilityRole="progressbar"
                justifyContent="center"
                onLayout={handleTrackLayout}
                elevation="$6"
                shadowColor="$color1"
                shadowOffset={{ width: 0, height: 0 }}
                shadowOpacity={1}
                shadowRadius={4}
              >
                {/* Visual progress track */}
                <YStack
                  height={trackHeight}
                  backgroundColor={trackBackgroundColor}
                  position="relative"
                  elevation="$6"
                  shadowColor="$color1"
                  shadowOffset={{ width: 0, height: 0 }}
                  shadowOpacity={0.5}
                  shadowRadius={4}
                >
                  {/* Progress fill */}
                  <Animated.View
                    style={[
                      {
                        height: '100%',
                        backgroundColor: fillColorValue,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                      } as ViewStyle,
                      fillAnimatedStyle,
                    ]}
                    testID={fillTestID}
                    data-testid={fillTestID}
                  />

                  <YStack paddingLeft={12}>
                    {/* Scrubber handle */}
                    <GestureDetector gesture={mainGesture}>
                      <Animated.View
                        style={[
                          {
                            position: 'absolute',
                            left: 0,
                            top: handleTopOffset,
                            width: handleTouchArea,
                            height: handleTouchArea,
                            marginLeft: handleMarginLeft,
                            zIndex: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          } as ViewStyle,
                          handleContainerAnimatedStyle,
                        ]}
                      >
                        <View
                          style={{
                            width: handleSize,
                            height: handleSize,
                            backgroundColor: handleColor,
                            borderRadius: handleSize / 2,
                            borderWidth: 0,
                            borderColor: '$color12',
                            elevation: isScrubbing ? 2 : 0,
                            opacity: handleOpacity,
                            transform: [{ scale: handleScale }],
                          }}
                          testID={handleTestID}
                          data-testid={handleTestID}
                          pointerEvents={handleOpacity > 0.01 ? 'auto' : 'none'}
                        />
                      </Animated.View>
                    </GestureDetector>
                  </YStack>
                </YStack>
              </YStack>
            </Pressable>
          </GestureDetector>
        )}
      </Animated.View>
    )
  }
)

ProgressBar.displayName = 'ProgressBar'

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(ProgressBar as any).whyDidYouRender = false
}
