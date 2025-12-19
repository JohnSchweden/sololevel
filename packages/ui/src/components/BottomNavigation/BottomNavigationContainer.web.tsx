import { LinearGradient } from '@tamagui/linear-gradient'
import React, { useMemo } from 'react'
import { YStack } from 'tamagui'

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
  disableBlur = false,
  bottomOffset = 0,
}: {
  children: React.ReactNode
  disableBlur?: boolean
  bottomOffset?: number
}) {
  // PERF FIX: useSafeAreaInsets returns stable constant, no memoization needed
  // but memoize derived values to prevent recalculation
  const insets = useSafeAreaInsets()
  const containerHeight = useMemo(() => 52 + insets.bottom, [insets.bottom])

  if (disableBlur) {
    return (
      <YStack
        position="absolute"
        bottom={bottomOffset}
        left={0}
        right={0}
        height={containerHeight}
        paddingBottom={insets.bottom}
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="transparent"
        zIndex={10}
      >
        {children}
      </YStack>
    )
  }

  return (
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.7)', 'transparent']}
      locations={[0, 1]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      position="absolute"
      bottom={bottomOffset}
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
