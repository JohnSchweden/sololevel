import { type BlurViewProps, BlurView as ExpoBlurView } from 'expo-blur'
import React from 'react'
import { Platform } from 'react-native'

/**
 * Platform-aware BlurView wrapper
 *
 * On Android, expo-blur requires `experimentalBlurMethod="dimezisBlurView"` to work.
 * This wrapper automatically adds the prop on Android while keeping iOS behavior unchanged.
 *
 * @example
 * ```tsx
 * <BlurView intensity={30} tint="dark">
 *   {children}
 * </BlurView>
 * ```
 */
export function BlurView(props: BlurViewProps): React.ReactElement {
  return (
    <ExpoBlurView
      {...props}
      // Android requires experimentalBlurMethod for blur to work
      {...(Platform.OS === 'android' && { experimentalBlurMethod: 'dimezisBlurView' })}
    />
  )
}

// Re-export types for convenience
export type { BlurViewProps } from 'expo-blur'
