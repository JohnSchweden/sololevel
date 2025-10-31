/**
 * Example: Using Animation Performance Hooks Together
 *
 * This example demonstrates how to combine all three performance hooks
 * for comprehensive animation monitoring.
 *
 * ## Works with ALL Animation Types:
 *
 * ✅ **Opacity** (0-1)
 * ✅ **Scale** (0-1, or any range)
 * ✅ **Translation** (pixels: translateX, translateY)
 * ✅ **Rotation** (degrees/radians)
 * ✅ **Height/Width** (pixels)
 * ✅ **Scroll Position** (pixels)
 * ✅ **Progress** (0-100, 0-1, any range)
 * ✅ **Any numeric animated value**
 *
 * The hooks are **animation-type agnostic** - they just monitor numeric values!
 */

import React from 'react'
import { Text, View } from 'react-native'
import { useAnimationCompletion, useFrameDropDetection, useSmoothnessTracking } from './index'

/**
 * Example 1: Opacity Animation
 */
export function OpacityAnimationExample() {
  const [opacity, setOpacity] = React.useState(0)

  // 1. True completion detection
  const completion = useAnimationCompletion({
    currentValue: opacity,
    targetValue: 1,
    estimatedDuration: 200,
    componentName: 'ExampleComponent',
    animationName: 'opacity-fade-in',
    direction: 'fade-in',
    onComplete: (actualDuration) => {
      console.log('Animation completed!', actualDuration)
    },
  })

  // 2. Smoothness tracking (tracks variance between completions)
  const smoothness = useSmoothnessTracking({
    duration: completion.actualDuration,
    componentName: 'ExampleComponent',
    animationName: 'opacity-fade-in',
  })

  // 3. Frame drop detection (monitors FPS during animation)
  const frameDrops = useFrameDropDetection({
    isActive: opacity > 0 && opacity < 1, // Active during animation
    componentName: 'ExampleComponent',
    animationName: 'opacity-fade-in',
  })

  // Trigger animation
  const handlePress = () => {
    setOpacity(1)
  }

  return (
    <View>
      <View style={{ opacity }} />

      {completion.isComplete && <Text>Opacity animation: {completion.actualDuration}ms</Text>}
    </View>
  )
}

/**
 * Example 2: Scale Animation
 */
export function ScaleAnimationExample() {
  const [scale, setScale] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: scale,
    targetValue: 1, // Scale from 0 to 1
    estimatedDuration: 300,
    componentName: 'ScaleAnimation',
    animationName: 'scale-up',
  })

  // Works exactly the same!
  return <View style={{ transform: [{ scale }] }} />
}

/**
 * Example 3: Translation Animation (X position)
 */
export function TranslationAnimationExample() {
  const [translateX, setTranslateX] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: translateX,
    targetValue: 100, // Move 100px to the right
    estimatedDuration: 400,
    componentName: 'TranslationAnimation',
    animationName: 'slide-right',
    tolerance: 1, // Pixels - adjust tolerance for pixel values
  })

  return <View style={{ transform: [{ translateX }] }} />
}

/**
 * Example 4: Height Animation
 */
export function HeightAnimationExample() {
  const [height, setHeight] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: height,
    targetValue: 200, // Animate to 200px height
    estimatedDuration: 300,
    componentName: 'HeightAnimation',
    animationName: 'expand-height',
    tolerance: 2, // Pixels - 2px tolerance for height
  })

  return <View style={{ height }} />
}

/**
 * Example 5: Rotation Animation (degrees)
 */
export function RotationAnimationExample() {
  const [rotation, setRotation] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: rotation,
    targetValue: 360, // Rotate 360 degrees
    estimatedDuration: 500,
    componentName: 'RotationAnimation',
    animationName: 'rotate',
    tolerance: 5, // Degrees - 5 degree tolerance
  })

  return <View style={{ transform: [{ rotate: `${rotation}deg` }] }} />
}

/**
 * Example 6: Progress Animation (0-100)
 */
export function ProgressAnimationExample() {
  const [progress, setProgress] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: progress,
    targetValue: 100, // Progress from 0 to 100%
    estimatedDuration: 1000,
    componentName: 'ProgressAnimation',
    animationName: 'progress-bar',
    tolerance: 0.5, // 0.5% tolerance
  })

  return <View style={{ width: `${progress}%` }} />
}

/**
 * Example 7: Scroll Position Animation
 */
export function ScrollAnimationExample() {
  const [scrollY, setScrollY] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: scrollY,
    targetValue: 500, // Scroll to 500px position
    estimatedDuration: 600,
    componentName: 'ScrollAnimation',
    animationName: 'scroll-to-bottom',
    tolerance: 10, // 10px tolerance for scroll position
  })

  // Works with scroll animations too!
  return null
}

/**
 * Example 8: Combined Animation (Multiple Properties)
 */
export function CombinedAnimationExample() {
  const [opacity, setOpacity] = React.useState(0)
  const [scale, setScale] = React.useState(0.5)
  const [translateY, setTranslateY] = React.useState(-50)

  // Track each property separately
  const opacityCompletion = useAnimationCompletion({
    currentValue: opacity,
    targetValue: 1,
    estimatedDuration: 300,
    componentName: 'CombinedAnimation',
    animationName: 'fade-in',
  })

  const scaleCompletion = useAnimationCompletion({
    currentValue: scale,
    targetValue: 1,
    estimatedDuration: 300,
    componentName: 'CombinedAnimation',
    animationName: 'scale-up',
  })

  const translateCompletion = useAnimationCompletion({
    currentValue: translateY,
    targetValue: 0,
    estimatedDuration: 300,
    componentName: 'CombinedAnimation',
    animationName: 'slide-up',
    tolerance: 1,
  })

  // All animations complete?
  const allComplete =
    opacityCompletion.isComplete && scaleCompletion.isComplete && translateCompletion.isComplete

  return (
    <View
      style={{
        opacity,
        transform: [{ scale }, { translateY }],
      }}
    >
      {allComplete && <Text>All animations complete!</Text>}
    </View>
  )
}

/**
 * Real-world example: ProgressBar with performance tracking
 */
export function ProgressBarWithPerformance({
  variant,
  progress,
  isScrubbing,
  controlsVisible,
}: {
  variant: 'normal' | 'persistent'
  progress: number
  isScrubbing: boolean
  controlsVisible: boolean
}) {
  // Calculate handle opacity
  const handleOpacity =
    variant === 'persistent'
      ? controlsVisible || isScrubbing
        ? 1
        : 0.7
      : controlsVisible || isScrubbing
        ? 1
        : 0

  // Target opacity based on state
  const targetOpacity = controlsVisible || isScrubbing ? 1 : variant === 'persistent' ? 0.7 : 0

  // 1. True completion detection
  const completion = useAnimationCompletion({
    currentValue: handleOpacity,
    targetValue: targetOpacity,
    estimatedDuration: 200, // quick animation
    componentName: 'ProgressBar',
    animationName: `handle-opacity-${variant}`,
    direction: handleOpacity > targetOpacity ? 'fade-out' : 'fade-in',
  })

  // 2. Smoothness tracking
  const smoothness = useSmoothnessTracking({
    duration: completion.actualDuration,
    componentName: 'ProgressBar',
    animationName: `handle-opacity-${variant}`,
    windowSize: 10, // Track last 10 animations
  })

  // 3. Frame drop detection (only active when opacity is animating)
  const isAnimating = Math.abs(handleOpacity - targetOpacity) > 0.01
  const frameDrops = useFrameDropDetection({
    isActive: isAnimating,
    componentName: 'ProgressBar',
    animationName: `handle-opacity-${variant}`,
  })

  // Log metrics in development
  React.useEffect(() => {
    if (__DEV__ && completion.isComplete) {
      console.log('ProgressBar animation metrics:', {
        duration: completion.actualDuration,
        difference: completion.difference,
        smoothness: smoothness.metrics.smoothnessScore,
        frameDrops: frameDrops.metrics.droppedFrames,
      })
    }
  }, [
    completion.isComplete,
    completion.actualDuration,
    completion.difference,
    smoothness,
    frameDrops,
  ])

  return null // Component logic here
}

/**
 * Minimal example: Just completion detection
 */
export function MinimalExample() {
  const [opacity, setOpacity] = React.useState(0)

  const completion = useAnimationCompletion({
    currentValue: opacity,
    targetValue: 1,
    componentName: 'Minimal',
  })

  return <View style={{ opacity }}>{completion.isComplete && <Text>Done!</Text>}</View>
}
