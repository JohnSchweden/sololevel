import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { Platform, StatusBar } from 'react-native'

/**
 * Hook to hide/show status bar based on screen focus
 *
 * @param hidden - Whether to hide the status bar when screen is focused
 * @param animation - Animation type for status bar transitions
 * @param platforms - Array of platforms to apply this on. Defaults to ['ios', 'android']
 */
export const useStatusBar = (
  hidden = true,
  animation: 'none' | 'fade' | 'slide' = 'fade',
  platforms: ('ios' | 'android')[] = ['ios', 'android']
) => {
  // Track if screen is actually focused to prevent cleanup from running during setOptions
  const isFocusedRef = useRef(false)

  // Check if we're in a test environment or if navigation context is available
  const isTestEnvironment = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined'

  // Check if current platform is in the allowed platforms list
  const currentPlatform = Platform.OS
  const shouldApply =
    !isTestEnvironment &&
    StatusBar &&
    (currentPlatform === 'ios' || currentPlatform === 'android') &&
    platforms.includes(currentPlatform)

  try {
    useFocusEffect(
      useCallback(() => {
        if (!shouldApply) {
          return
        }

        // Update ref when screen is focused
        isFocusedRef.current = true

        // Set status bar visibility when screen is focused
        StatusBar.setHidden(hidden, animation)

        // Android: Set transparent background with translucent mode
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('transparent', true)
        }

        // Restore status bar when screen is unfocused (cleanup)
        // Skip cleanup if we're still focused (prevents race condition with navigation.setOptions)
        return () => {
          // Only restore status bar if screen is actually unfocused
          // This prevents cleanup from running when navigation.setOptions() triggers a refocus
          // Check ref before updating: if false, we've already been refocused (race condition)
          if (isFocusedRef.current) {
            // Update ref when screen is unfocused
            isFocusedRef.current = false

            StatusBar.setHidden(!hidden, animation)
            // Android: Restore transparent background on cleanup
            if (Platform.OS === 'android') {
              StatusBar.setBackgroundColor('transparent', true)
            }
          }
        }
      }, [hidden, animation, shouldApply])
    )
  } catch (error) {
    // Fallback if navigation context is not available
    if (shouldApply && StatusBar) {
      StatusBar.setHidden(hidden, animation)
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true)
      }
    }
  }
}
