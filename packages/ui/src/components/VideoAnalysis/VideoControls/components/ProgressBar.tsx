// import { log } from '@my/logging'
import React, { useCallback, useEffect } from 'react'
import { type LayoutChangeEvent, Pressable, View, type ViewStyle } from 'react-native'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import Animated, {
  type AnimatedStyle,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated'
import { YStack, useTheme } from 'tamagui'

// Animation duration for Reanimated withTiming animation
// 'quick': 200ms for user-initiated interactions
const QUICK_ANIMATION_DURATION = 200

/**
 * Props for the ProgressBar component
 *
 * @property variant - Visual variant: 'normal' (larger, visible with controls) or 'persistent' (smaller, always visible)
 * @property progress - Current progress percentage (0-100)
 * @property isScrubbing - Whether user is currently scrubbing this progress bar
 * @property controlsVisible - Whether video controls are visible (affects styling)
 * @property progressBarWidth - Width of the progress bar in pixels (from onLayout)
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
  /** Width of the progress bar in pixels (from onLayout) */
  progressBarWidth: number
  /** Reanimated style for fade in/out animations */
  animatedStyle: AnimatedStyle<ViewStyle>
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
  /** Tamagui animation name for conditional timing (e.g., 'quick', 'lazy') */
  animationName?: 'quick' | 'lazy'
}

/**
 * ProgressBar Component
 *
 * Consolidated progress bar component that eliminates duplication between normal and persistent variants.
 * Supports two visual variants:
 * - **normal**: Larger progress bar (4px height, 14px handle) shown with main video controls
 * - **persistent**: Smaller progress bar (2px height, 10px handle) always visible at bottom
 *
 * @example
 * ```tsx
 * <ProgressBar
 *   variant="normal"
 *   progress={50}
 *   isScrubbing={false}
 *   controlsVisible={true}
 *   progressBarWidth={300}
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
    progressBarWidth: _progressBarWidth, // Received but not used internally (used by parent)
    animatedStyle,
    combinedGesture,
    mainGesture,
    onLayout,
    onFallbackPress,
    testID,
    animationName = 'quick', // Default to 'quick' for backwards compatibility
  }) => {
    // Get theme to resolve Tamagui color tokens for React Native Animated.View
    const theme = useTheme()

    // Variant-specific dimensions
    const isNormal = variant === 'normal'
    const trackHeight = isNormal ? 4 : 2
    const handleSize = 12 // Same size for both normal and persistent variants
    const handleTouchArea = 44 // Consistent 44px touch area for both variants
    const handleTopOffset = isNormal ? -20 : -23 // Center within touch area
    const handleMarginLeft = isNormal ? -22 : -16 // Center the touch area

    // Variant-specific colors (Tamagui tokens)
    const trackBackgroundColor = isNormal ? '$color3' : '$color8'
    const fillColor = isNormal ? '$teal9' : controlsVisible ? '$teal9' : '$color11'
    const handleColorToken = isNormal
      ? isScrubbing
        ? '$teal10'
        : '$teal9'
      : controlsVisible
        ? isScrubbing
          ? '$teal10'
          : '$teal9'
        : '$color8'

    // Resolve color token to actual color value for React Native Animated.View
    // Remove '$' prefix and access theme property
    const handleColor = theme[handleColorToken.slice(1) as keyof typeof theme]?.val as string

    // Calculate target opacity and scale based on state
    const targetOpacity = isNormal
      ? controlsVisible || isScrubbing
        ? 1
        : 0.7
      : controlsVisible || isScrubbing
        ? 1
        : 0

    const targetScale = isNormal
      ? controlsVisible || isScrubbing
        ? 1
        : 0.3
      : controlsVisible || isScrubbing
        ? 1
        : 0.3

    // Reanimated shared values for handle animation (runs on UI thread)
    const handleOpacity = useSharedValue(targetOpacity)
    const handleScale = useSharedValue(targetScale)

    // Animation duration
    const duration = animationName === 'quick' ? QUICK_ANIMATION_DURATION : 400

    // Stable callback for animation completion logging
    const handleAnimationComplete = useCallback(() => {
      // log.debug('ProgressBar', '📊 [PERFORMANCE] Animation completed', {
      //   animationName: `handle-opacity-${variant}`,
      //   targetValue: targetOpacity,
      //   configuredDuration,
      // })
    }, [])

    // Update animations when state changes
    useEffect(() => {
      cancelAnimation(handleOpacity)
      cancelAnimation(handleScale)

      handleOpacity.value = withTiming(
        targetOpacity,
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

      handleScale.value = withTiming(targetScale, {
        duration,
        easing: Easing.out(Easing.ease),
      })
    }, [targetOpacity, targetScale, duration, handleAnimationComplete])

    // Animated styles for handle (runs on UI thread)
    const handleAnimatedStyle = useAnimatedStyle(() => {
      const currentOpacity = handleOpacity.value
      const currentScale = handleScale.value

      return {
        opacity: currentOpacity,
        transform: [{ scale: currentScale }],
      }
    })

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

    return (
      <Animated.View
        style={[
          {
            position: isNormal ? 'relative' : 'absolute',
            bottom: containerBottom,
            left: 0,
            right: 0,
            height: containerHeight,
            justifyContent: 'center',
            zIndex: isNormal ? 30 : undefined,
            pointerEvents: 'auto',
          },
          animatedStyle,
        ]}
      >
        {isNormal ? (
          // Normal variant: Wrapped in YStack for container structure
          <YStack
            height={44}
            justifyContent="center"
            testID={containerTestID}
          >
            <GestureDetector gesture={combinedGesture}>
              <Pressable
                onPress={(event) => {
                  const { locationX } = event.nativeEvent
                  onFallbackPress(locationX)
                }}
                style={{ flex: 1 }}
                testID={pressableTestID}
              >
                <YStack
                  height={44}
                  backgroundColor="transparent"
                  borderRadius={2}
                  position="relative"
                  testID={trackTestID}
                  justifyContent="center"
                  onLayout={onLayout}
                >
                  {/* Visual progress track */}
                  <YStack
                    height={trackHeight}
                    backgroundColor={trackBackgroundColor}
                    borderRadius={2}
                    position="relative"
                  >
                    {/* Completed progress fill */}
                    <YStack
                      height="100%"
                      width={`${progress}%`}
                      backgroundColor={fillColor}
                      borderRadius={2}
                      testID={fillTestID}
                      position="absolute"
                      left={0}
                      top={0}
                      animation={animationName}
                    />

                    {/* Scrubber handle */}
                    <GestureDetector gesture={mainGesture}>
                      <View
                        style={{
                          position: 'absolute',
                          left: `${progress}%`,
                          top: handleTopOffset,
                          width: handleTouchArea,
                          height: handleTouchArea,
                          marginLeft: handleMarginLeft,
                          zIndex: 10,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Animated.View
                          style={[
                            {
                              width: handleSize,
                              height: handleSize,
                              backgroundColor: handleColor,
                              borderRadius: handleSize / 2,
                              borderWidth: 0,
                              borderColor: '$color12',
                              elevation: isScrubbing ? 2 : 0,
                            },
                            handleAnimatedStyle,
                          ]}
                          testID={handleTestID}
                          pointerEvents={targetOpacity > 0.01 ? 'auto' : 'none'}
                        />
                      </View>
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
            >
              <YStack
                height={44}
                backgroundColor="transparent"
                opacity={0.8}
                testID={trackTestID}
                accessibilityLabel={`Video progress: ${progressPercentage}% complete`}
                accessibilityRole="progressbar"
                justifyContent="center"
                onLayout={onLayout}
              >
                {/* Visual progress track */}
                <YStack
                  height={trackHeight}
                  backgroundColor={trackBackgroundColor}
                  position="relative"
                >
                  {/* Progress fill */}
                  <YStack
                    height="100%"
                    width={`${progress}%`}
                    backgroundColor={fillColor}
                    testID={fillTestID}
                    animation={animationName}
                  />

                  <YStack paddingLeft={12}>
                    {/* Scrubber handle */}
                    <GestureDetector gesture={mainGesture}>
                      <View
                        style={{
                          position: 'absolute',
                          left: `${progress}%`,
                          top: handleTopOffset,
                          width: handleTouchArea,
                          height: handleTouchArea,
                          marginLeft: handleMarginLeft,
                          zIndex: 10,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Animated.View
                          style={[
                            {
                              width: handleSize,
                              height: handleSize,
                              backgroundColor: handleColor,
                              borderRadius: handleSize / 2,
                              borderWidth: 0,
                              borderColor: '$color12',
                              elevation: isScrubbing ? 2 : 0,
                            },
                            handleAnimatedStyle,
                          ]}
                          testID={handleTestID}
                          pointerEvents={targetOpacity > 0.01 ? 'auto' : 'none'}
                        />
                      </View>
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
