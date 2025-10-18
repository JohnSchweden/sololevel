import { LinearGradient } from '@tamagui/linear-gradient'
import React from 'react'

// Platform-agnostic safe area hook for bottom navigation
const useSafeAreaInsets = () => {
  // Default safe area values for cross-platform compatibility
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
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
  const insets = useSafeAreaInsets()

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
      height={72 + insets.bottom}
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      zIndex={10}
    >
      {children}
    </LinearGradient>
  )
}
