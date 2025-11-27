import { useIsFocused } from '@react-navigation/native'
// eslint-disable-next-line deprecation/deprecation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useEffect } from 'react'

/**
 * Unique tag for record tab keep-awake activation.
 * Using tags allows proper reference counting - multiple activations with the same tag
 * are tracked separately from other keep-awake activations.
 */
const KEEP_AWAKE_TAG = 'record-tab'

/**
 * Hook to keep the screen awake only when the record tab is focused.
 *
 * Uses tag-based activation for proper reference counting:
 * - Each activation with the same tag increments a counter for that tag
 * - Deactivation decrements only that tag's counter
 * - Screen stays awake if ANY tag's counter > 0
 *
 * Uses `useIsFocused()` from React Navigation instead of `usePathname()` because:
 * - Expo Router keeps tabs mounted even when not focused
 * - `useIsFocused()` accurately tracks actual tab focus state
 * - Pathname alone doesn't reflect whether tab is actually visible/focused
 *
 * This prevents issues with mismatched activate/deactivate calls and allows
 * multiple components to manage keep-awake independently.
 */
export const useKeepAwake = (): void => {
  // Check if we're in a test environment
  const isTestEnvironment = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined'

  // Use React Navigation's focus state - more accurate than pathname for tab focus
  // Expo Router keeps tabs mounted, so pathname doesn't reflect actual focus
  const isFocused = useIsFocused()

  if (isTestEnvironment) {
    // In test environment, do nothing
    return
  }

  useEffect(() => {
    if (isFocused) {
      // Tab is focused - activate keep-awake with unique tag
      // eslint-disable-next-line deprecation/deprecation
      activateKeepAwakeAsync(KEEP_AWAKE_TAG)

      return () => {
        // Cleanup: deactivate only our tag when tab loses focus
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake(KEEP_AWAKE_TAG)
      }
    }
    // Tab is NOT focused - return cleanup that deactivates (in case it was previously active)
    // This ensures deactivation only happens during cleanup, not on every render
    // This is crucial because Expo Router keeps tabs mounted
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      deactivateKeepAwake(KEEP_AWAKE_TAG)
    }
  }, [isFocused])
}
