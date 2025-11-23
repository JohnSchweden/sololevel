import { LinearGradient } from '@tamagui/linear-gradient'
import React, { useMemo } from 'react'

// Platform-agnostic safe area hook for bottom navigation
// PERF FIX: Return stable constant object (defined outside component to prevent re-allocation)
const WEB_SAFE_AREA_INSETS = Object.freeze({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
})

const useSafeAreaInsets = () => {
  // Default safe area values for cross-platform compatibility
  return WEB_SAFE_AREA_INSETS
}

/**
 * Web Bottom Navigation Container
 * Uses LinearGradient for web-compatible gradient effect
 * Note: BlurView and MaskedView are not available on web
 */
export function BottomNavigationContainer({
  children,
}: {
  children: React.ReactNode
}) {
  // PERF FIX: useSafeAreaInsets returns stable constant, no memoization needed
  // but memoize derived values to prevent recalculation
  const insets = useSafeAreaInsets()
  const containerHeight = useMemo(() => 72 + insets.bottom, [insets.bottom])

  return (
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.7)', 'transparent']}
      locations={[0, 1]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      paddingBottom={insets.bottom}
      height={containerHeight}
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      zIndex={10}
    >
      {children}
    </LinearGradient>
  )
}
