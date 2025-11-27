import React, { useMemo, useRef } from 'react'

import {
  Easing,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { YStack, useTheme } from 'tamagui'

export interface CircularSpinnerProps {
  /**
   * Size of the spinner
   * @default 'small'
   */
  size?: 'small' | 'large'

  /**
   * Color of the spinner (uses theme color token)
   * @default '$color12'
   */
  color?: string

  /**
   * Stroke width of the circle line
   * @default 2
   */
  strokeWidth?: number

  /**
   * Test ID for testing
   */
  testID?: string
}

const SIZE_MAP = {
  small: 20,
  large: 40,
} as const

/**
 * CircularSpinner Component
 *
 * A plain circular line spinner that rotates continuously.
 * Uses SVG for precise rendering of a simple rotating circle.
 *
 * @example
 * ```tsx
 * <CircularSpinner size="small" color="$color12" />
 * ```
 */
export const CircularSpinner = React.memo(function CircularSpinner({
  size = 'small',
  color = '$color12',
  strokeWidth = 2.5,
  testID = 'circular-spinner',
}: CircularSpinnerProps): React.ReactElement {
  const rotation = useSharedValue(0)
  const theme = useTheme()

  // Memoize size-dependent calculations
  const { spinnerSize, center, radius, strokeDasharray } = useMemo(() => {
    const s = SIZE_MAP[size]
    const c = s / 2
    const r = (s - strokeWidth) / 2
    const circ = 2 * Math.PI * r
    // Draw ~25% of the circle (90 degrees) for a shorter white line
    const dash = `${circ * 0.25} ${circ}`
    return {
      spinnerSize: s,
      center: c,
      radius: r,
      strokeDasharray: dash,
    }
  }, [size, strokeWidth])

  // Memoize color resolution
  const { resolvedColor, greyColor } = useMemo(() => {
    const resolved = color.startsWith('$')
      ? (theme[color as keyof typeof theme]?.val as string) || color
      : color
    const grey = (theme.$color11?.val as string) || '#b0b0b0'
    return { resolvedColor: resolved, greyColor: grey }
  }, [color, theme])

  // Start animation synchronously during render (before effects/paint) for instant start
  // This runs on first render before any useEffect/useLayoutEffect
  const hasStartedAnimation = useRef(false)
  if (!hasStartedAnimation.current) {
    hasStartedAnimation.current = true
    // Dispatch to UI thread immediately - bypasses JS thread congestion
    runOnUI(() => {
      'worklet'
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1, // infinite repeat
        false // don't reverse
      )
    })()
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  }, [])

  return (
    <YStack
      width={spinnerSize}
      height={spinnerSize}
      alignItems="center"
      justifyContent="center"
      testID={testID}
    >
      <Animated.View style={animatedStyle}>
        <Svg
          width={spinnerSize}
          height={spinnerSize}
        >
          {/* Light grey background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={greyColor}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.8}
          />
          {/* White rotating line */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={resolvedColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </YStack>
  )
})
