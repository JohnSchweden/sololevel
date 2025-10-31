# Battle-Tested Animation Performance Investigation Guide

## Overview

This guide provides battle-tested practices for investigating three critical animation performance issues:

1. **Frame drops or jank** - Detecting when animations fail to render at 60fps
2. **Visual smoothness** - Measuring perceived smoothness and identifying stuttering
3. **True animation completion time** - Capturing actual animation end vs estimated completion

---

## 1. Frame Drops / Jank Detection

### Current Limitation
The existing `performance.now()` tracking measures estimated completion time, not frame-by-frame smoothness.

### Battle-Tested Solutions

#### A. React Native Performance Monitor (Built-in)

**Activation:**
```typescript
// In development, shake device → "Show Perf Monitor"
// Or programmatically:
import { enableScreens } from 'react-native-screens'
import { PerformanceMonitor } from 'react-native'

// In dev mode only
if (__DEV__) {
  PerformanceMonitor?.start()
}
```

**What it shows:**
- Real-time FPS (frames per second)
- JS thread FPS
- UI thread FPS
- Memory usage

**Limitations:**
- Development only
- No programmatic access to metrics
- Requires device shake gesture

#### B. Custom FPS Monitoring with `requestAnimationFrame`

**Implementation:**
```typescript
import { useEffect, useRef } from 'react'
import { log } from '@my/logging'

interface FPSMetrics {
  currentFPS: number
  averageFPS: number
  droppedFrames: number
  frameTimes: number[]
}

export function useFPSMonitoring(
  isActive: boolean,
  windowSize: number = 60 // Track last 60 frames
): FPSMetrics {
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef<number | null>(null)
  const frameTimesRef = useRef<number[]>([])
  const droppedFramesRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const measureFrame = (currentTime: number) => {
      if (lastFrameTimeRef.current !== null) {
        const frameDuration = currentTime - lastFrameTimeRef.current
        const expectedFrameTime = 1000 / 60 // 16.67ms for 60fps
        
        // Detect dropped frames (frame took longer than 2x expected)
        if (frameDuration > expectedFrameTime * 2) {
          const dropped = Math.floor(frameDuration / expectedFrameTime) - 1
          droppedFramesRef.current += dropped
        }

        frameTimesRef.current.push(frameDuration)
        
        // Keep only last N frames
        if (frameTimesRef.current.length > windowSize) {
          frameTimesRef.current.shift()
        }
      }

      lastFrameTimeRef.current = currentTime
      frameCountRef.current++
      rafIdRef.current = requestAnimationFrame(measureFrame)
    }

    rafIdRef.current = requestAnimationFrame(measureFrame)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [isActive, windowSize])

  const currentFPS = frameTimesRef.current.length > 0
    ? Math.round(1000 / frameTimesRef.current[frameTimesRef.current.length - 1])
    : 60

  const averageFPS = frameTimesRef.current.length > 0
    ? Math.round(1000 / (frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length))
    : 60

  return {
    currentFPS,
    averageFPS,
    droppedFrames: droppedFramesRef.current,
    frameTimes: [...frameTimesRef.current],
  }
}

// Usage in component:
const fpsMetrics = useFPSMonitoring(controlsVisible, 60)

useEffect(() => {
  if (fpsMetrics.droppedFrames > 10) {
    log.warn('AnimationPerformance', '⚠️ Frame drops detected', {
      droppedFrames: fpsMetrics.droppedFrames,
      currentFPS: fpsMetrics.currentFPS,
      averageFPS: fpsMetrics.averageFPS,
    })
  }
}, [fpsMetrics])
```

#### C. Reanimated Frame Callback (UI Thread)

**Best for:** Tracking animations running on UI thread (Reanimated)

```typescript
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated'
import { runOnJS } from 'react-native-reanimated'

export function useReanimatedFPSMonitor(
  animationValue: SharedValue<number>,
  isActive: boolean
) {
  const lastFrameTimeRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)
  const droppedFramesRef = useRef(0)

  useAnimatedReaction(
    () => animationValue.value,
    (currentValue, previousValue) => {
      'worklet'
      if (!isActive) return

 مورد      const now = Date.now()
      if (lastFrameTimeRef.current !== null) {
        const frameDuration = now - lastFrameTimeRef.current
        const expectedFrameTime = 16.67 // 60fps

        if (frameDuration > expectedFrameTime * 2) {
          const dropped = Math.floor(frameDuration / expectedFrameTime) - 1
          droppedFramesRef.current += dropped
          
          if (dropped > 5) {
            runOnJS(log.warn)('AnimationPerformance', '⚠️ UI thread frame drop', {
              dropped,
              frameDuration: Math.round(frameDuration),
              expected: expectedFrameTime,
            })
          }
        }
      }
      lastFrameTimeRef.current = now
      frameCountRef.current++
    },
    [isActive]
  )
}
```

#### D. React Native Performance Library

**Install:**
```bash
yarn add react-native-performance
# iOS: pod install
```

**Usage:**
```typescript
import Performance, { PerformanceObserver } from 'react-native-performance'

// Observe frame-related entries
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'measure') {
      // Log slow frames
      if (entry.duration > 20) { // >20ms = dropped frame
        log.warn('AnimationPerformance', 'Slow frame detected', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        })
      }
    }
  })
})

observer.observe({ entryTypes: ['measure', 'mark'] })

// Mark animation frames
function trackAnimationFrame() {
  Performance.mark('frame-start')
  requestAnimationFrame(() => {
    Performance.mark('frame-end')
    Performance.measure('frame-duration', 'frame-start', 'frame-end')
  })
}
```

---

## 2. Visual Smoothness Measurement

### Battle-Tested Approaches

#### A. Frame Time Variance Analysis

**Metric:** Standard deviation of frame times (lower = smoother)

```typescript
interface SmoothnessMetrics {
  variance: number
  stdDev: number
  jankyFrames: number
  smoothnessScore: number // 0-100
}

export function calculateSmoothness(frameTimes: number[]): SmoothnessMetrics {
  if (frameTimes.length === 0) {
    return { variance: 0, stdDev: 0, jankyFrames: 0, smoothnessScore: 100 }
  }

  const average = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
  const variance = frameTimes.reduce((sum, time) => {
    return sum + Math.pow(time - average, 2)
  }, 0) / frameTimes.length
  const stdDev = Math.sqrt(variance)

  // Frame time > 20ms (2x expected) = janky
  const jankyFrames = frameTimes.filter(time => time > 20).length
  const jankPercentage = (jankyFrames / frameTimes.length) * 100

  // Smoothness score: 100 = perfect, 0 = very janky
  const smoothnessScore = Math.max(0, 100 - jankPercentage * 2)

  return {
    variance,
    stdDev,
    jankyFrames,
    smoothnessScore: Math.round(smoothnessScore),
  }
}

// Usage:
const smoothness = calculateSmoothness(fpsMetrics.frameTimes)
if (smoothness.smoothnessScore < 80) {
  log.warn('AnimationPerformance', '⚠️ Low smoothness score', smoothness)
}
```

#### B. Long Task Detection (JS Thread Blocking)

**Detects:** When JS thread blocks UI thread, causing animation stutter

```typescript
import { useEffect, useRef } from 'react'

export function useLongTaskDetection(
  threshold: number = 50, // 50ms = detectable stutter
  onLongTask?: (duration: number) => void
) {
  const lastTaskStartRef = useRef<number | null>(null)

  useEffect(() => {
    let scheduled = false

    const checkLongTask = () => {
      const now = performance.now()
      
      if (lastTaskStartRef.current !== null) {
        const taskDuration = now - lastTaskStartRef.current
        
        if (taskDuration > threshold) {
          log.warn('AnimationPerformance', '⚠️ Long task detected', {
            duration: Math.round(taskDuration),
            threshold,
          })
          onLongTask?.(taskDuration)
        }
      }

      lastTaskStartRef.current = now
      scheduled = false
    }

    const scheduleCheck = () => {
      if (!scheduled) {
        scheduled = true
        requestIdleCallback?.(checkLongTask, { timeout: 1000 }) ||
          setTimeout(checkLongTask, 0)
      }
    }

    // Monitor JS thread activity
    const interval = setInterval(scheduleCheck, 100)

      return () => {
      clearInterval(interval)
    }, [threshold, onLongTask])
}
```

#### C. Visual Completion Detection (Paint Timing)

**For Web:** Uses Paint Timing API
**For Native:** Uses layout completion callbacks

```typescript
// Web implementation
export function useVisualCompletionTracking(
  elementRef: React.RefObject<HTMLElement>,
  onComplete?: (duration: number) => void
) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'paint') {
          log.debug('AnimationPerformance', '🎨 Paint completed', {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          })
          onComplete?.(entry.duration)
        }
      })
    })

    observer.observe({ entryTypes: ['paint'] })

    return () => observer.disconnect()
  }, [onComplete])
}

// Native implementation (React Native)
export function useLayoutCompletionTracking(
  onLayoutComplete?: (duration: number) => void
) {
  const layoutStartTimeRef = useRef<number | null>(null)

  const handleLayout = useCallback(() => {
    if (layoutStartTimeRef.current !== null) {
      const duration = performance.now() - layoutStartTimeRef.current
      log.debug('AnimationPerformance', '📐 Layout completed', {
        duration: Math.round(duration),
      })
      onLayoutComplete?.(duration)
    }
    layoutStartTimeRef.current = null
  }, [onLayoutComplete])

  return handleLayout
}
```

---

## 3. True Animation Completion Time

### Problem with Current Approach
Current tracking uses `setTimeout(estimatedDuration + 50)`, which measures when we *expect* completion, not when animation *actually* completes.

### Battle-Tested Solutions

#### A. Reanimated `withTiming` Completion Callback

**Best for:** Animations using Reanimated `withTiming` or `withSpring`

```typescript
import { withTiming, runOnJS } from 'react-native-reanimated'
import { log } from '@my/logging'

export function useTrueAnimationCompletion(
  sharedValue: SharedValue<number>,
  targetValue: number,
  duration: number
) {
  const animationStartTimeRef = useRef<number | null>(null)

  const startAnimation = useCallback(() => {
    animationStartTimeRef.current = performance.now()
    
    sharedValue.value = withTiming(
      targetValue,
      {
        duration,
      },
      (finished) => {
        'worklet'
        if (finished && animationStartTimeRef.current !== null) {
          const actualDuration = performance.now() - animationStartTimeRef.current
          
          runOnJS(log.debug)('AnimationPerformance', '✅ Animation truly completed', {
            targetValue,
            estimatedDuration: duration,
            actualDuration: Math.round(actualDuration),
            difference: Math.round(actualDuration - duration),
          })
          
          animationStartTimeRef.current = null
        }
      }
    )
  }, [sharedValue, targetValue, duration])

  return startAnimation
}
```

#### B. Tamagui Animation Completion via `useAnimatedReaction`

**Best for:** Tamagui animations that don't expose completion callbacks

```typescript
import { useAnimatedReaction } from 'react-native-reanimated'
import { useTamagui } from '@tamagui/core'

export function useTamaguiAnimationCompletion(
  animatedValue: SharedValue<number>,
  targetValue: number,
  tolerance: number = 0.01
) {
  const startTimeRef = useRef<number | null>(null)
  const hasReachedTargetRef = useRef(false)

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue, previousValue) => {
      'worklet'
      const isAtTarget = Math.abs(currentValue - targetValue) < tolerance
      const wasAtTarget = previousValue !== null 
        ? Math.abs(previousValue - targetValue) < tolerance
        : false

      // Animation just reached target
      if (isAtTarget && !wasAtTarget) {
        if (startTimeRef.current !== null) {
          const actualDuration = performance.now() - startTimeRef.current
          
          runOnJS(log.debug)('AnimationPerformance', '✅ Tamagui animation completed', {
            targetValue,
            actualDuration: Math.round(actualDuration),
            finalValue: currentValue,
          })
          
          startTimeRef.current = null
          hasReachedTargetRef.current = true
        }
      }

      // Animation started (value changed from target)
      if (!isAtTarget && wasAtTarget) {
        startTimeRef.current = performance.now()
        hasReachedTargetRef.current = false
      }
    }
  )
}
```

#### C. Layout-Based Completion Detection

**Best for:** Animations that affect layout (height, width, position)

```typescript
export function useLayoutAnimationCompletion(
  onComplete?: (duration: number) => void
) {
  const animationStartRef = useRef<number | null>(null)
  const previousLayoutRef = useRef<{ width: number; height: number } | null>(null)

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout

    // Detect layout change (animation start)
    if (previousLayoutRef.current === null) {
      animationStartRef.current = performance.now()
      previousLayoutRef.current = { width, height }
      return
    }

    const prev = previousLayoutRef.current
    
    // Layout changed - animation in progress
    if (prev.width !== width || prev.height !== height) {
      previousLayoutRef.current = { width, height }
      
      // Check if layout stabilized (no change in last 50ms)
      // This indicates animation completion
      if (animationStartRef.current !== null) {
        setTimeout(() => {
          // Verify layout hasn't changed
          if (
            previousLayoutRef.current?.width === width &&
            previousLayoutRef.current?.height === height &&
            animationStartRef.current !== null
          ) {
            const duration = performance.now() - animationStartRef.current
            
            log.debug('AnimationPerformance', '✅ Layout animation completed', {
              duration: Math.round(duration),
              finalSize: { width, height },
            })
            
            onComplete?.(duration)
            animationStartRef.current = null
          }
        }, 50)
      }
    }
  }, [onComplete])

  return handleLayout
}
```

#### D. Visual State Monitoring (Most Reliable)

**Best for:** Opacity, scale, or color animations where visual state matters

```typescript
import { useAnimatedReaction, SharedValue } from 'react-native-reanimated'
import { runOnJS } from 'react-native-reanimated'

interface AnimationConfig {
  startValue: number
  endValue: number
  tolerance?: number
  requiredStableFrames?: number // Frames animation must be stable at target
}

export function useVisualAnimationCompletion(
  animatedValue: SharedValue<number>,
  config: AnimationConfig,
  onComplete: (actualDuration: number) => void
) {
  const {
    startValue,
    endValue,
    tolerance = 0.01,
    requiredStableFrames = config.requiredStableFrames ?? 3,
  } = config

  const startTimeRef = useRef<number | null>(null)
  const stableFrameCountRef = useRef(0)
  const previousValueRef = useRef<number | null>(null)

  useAnimatedReaction(
    () => animatedValue.value,
    (currentValue) => {
      'worklet'
      const isAtTarget = Math.abs(currentValue - endValue) < tolerance
      const isStable = previousValueRef.current !== null
        ? Math.abs(currentValue - previousValueRef.current) < tolerance / 2
        : false

      // Track animation start
      if (startTimeRef.current === null && Math.abs(currentValue - startValue) > tolerance) {
        startTimeRef.current = performance.now()
        stableFrameCountRef.current = 0
      }

      // Track stability at target
      if (isAtTarget) {
        if (isStable) {
          stableFrameCountRef.current++
        } else {
          stableFrameCountRef.current = 1 // Reset count if not stable
        }

        // Animation completed when stable at target for required frames
        if (
          stableFrameCountRef.current >= requiredStableFrames &&
          startTimeRef.current !== null
        ) {
          const actualDuration = performance.now() - startTimeRef.current
          
          runOnJS(onComplete)(actualDuration)
          
          startTimeRef.current = null
          stableFrameCountRef.current = 0
        }
      } else {
        stableFrameCountRef.current = 0
      }

      previousValueRef.current = currentValue
    }
  )
}

// Usage:
useVisualAnimationCompletion(
  opacityValue,
  {
    startValue: 0,
    endValue: 1,
    tolerance: 0.01,
    requiredStableFrames: 3, // Must be stable for 3 frames (~50ms at 60fps)
  },
  (actualDuration) => {
    log.debug('AnimationPerformance', '✅ Visual animation completed', {
      actualDuration: Math.round(actualDuration),
      estimatedDuration: 300,
      difference: Math.round(actualDuration - 300),
    })
  }
)
```

---

## Implementation Priority

### Immediate (High Value, Low Effort)
1. ✅ **Use Reanimated completion callbacks** for `withTiming`/`withSpring` animations
2. ✅ **Add visual state monitoring** for opacity/transform animations
3. ✅ **Calculate smoothness score** from existing frame timing data

### Short-term (High Value, Medium Effort)
4. ⚠️ **Implement FPS monitoring hook** for real-time frame drop detection
5. ⚠️ **Add long task detection** for JS thread blocking
6. ⚠️ **Replace setTimeout tracking** with true completion detection

### Long-term (High Value, High Effort)
7. 🔮 **Integrate `react-native-performance` library** for comprehensive monitoring
8. 🔮 **Build performance dashboard** aggregating all metrics
9. 🔮 **Add automated performance regression tests**

---

## Key Takeaways

1. **Frame Drops:** Use `requestAnimationFrame` monitoring or Reanimated frame callbacks
2. **Smoothness:** Track frame time variance and calculate smoothness score
3. **Completion Time:** Use animation library callbacks (Reanimated) or visual state monitoring
4. **Never rely on setTimeout** for true completion - always verify visual state
5. **Combine multiple metrics** for comprehensive understanding (FPS + smoothness + completion)

---

## References

- [React Native Performance Docs](https://reactnative.dev/docs/performance)
- [react-native-performance library](https://www.npmjs.com/package/react-native-performance)
- [Reanimated Performance Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance)
- [Web Performance Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_Timing_API)

