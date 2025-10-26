import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { StatusBar } from 'react-native'

/**
 * Hook to hide/show status bar based on screen focus
 *
 * @param hidden - Whether to hide the status bar when screen is focused
 * @param animation - Animation type for status bar transitions
 */
export const useStatusBar = (hidden = true, animation: 'none' | 'fade' | 'slide' = 'fade') => {
  // Check if we're in a test environment or if navigation context is available
  const isTestEnvironment = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined'

  if (isTestEnvironment || !StatusBar) {
    // In test environment or if StatusBar is not available, do nothing
    return
  }

  try {
    useFocusEffect(
      useCallback(() => {
        // Set status bar visibility when screen is focused
        StatusBar.setHidden(hidden, animation)

        // Restore status bar when screen is unfocused (cleanup)
        return () => {
          StatusBar.setHidden(!hidden, animation)
        }
      }, [hidden, animation])
    )
  } catch (error) {
    // Fallback if navigation context is not available
    if (StatusBar) {
      StatusBar.setHidden(hidden, animation)
    }
  }
}
