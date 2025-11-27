// eslint-disable-next-line deprecation/deprecation
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { usePathname } from 'expo-router'
import { useEffect } from 'react'

/**
 * Unique tag for camera recording keep-awake activation.
 * Using tags allows proper reference counting - multiple activations with the same tag
 * are tracked separately from other keep-awake activations.
 */
const KEEP_AWAKE_TAG = 'camera-recording'

/**
 * Hook to keep the screen awake only when on the CameraRecording (record) tab.
 *
 * Uses tag-based activation for proper reference counting:
 * - Each activation with the same tag increments a counter for that tag
 * - Deactivation decrements only that tag's counter
 * - Screen stays awake if ANY tag's counter > 0
 *
 * This prevents issues with mismatched activate/deactivate calls and allows
 * multiple components to manage keep-awake independently.
 */
export const useKeepAwake = (): void => {
  // Check if we're in a test environment
  const isTestEnvironment = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined'

  // Get current pathname to check if we're on the record tab
  const pathname = usePathname()
  const isOnRecordTab = pathname?.includes('/(tabs)/record') || pathname === '/record'

  if (isTestEnvironment) {
    // In test environment, do nothing
    return
  }

  useEffect(() => {
    if (isOnRecordTab) {
      // Activate with unique tag - won't interfere with other keep-awake activations
      // eslint-disable-next-line deprecation/deprecation
      activateKeepAwakeAsync(KEEP_AWAKE_TAG)

      return () => {
        // Deactivate only our tag - doesn't affect other activations
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake(KEEP_AWAKE_TAG)
      }
    }
    // If not on record tab, return cleanup that deactivates (in case it was previously active)
    // This ensures deactivation only happens during cleanup, not on every render
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      deactivateKeepAwake(KEEP_AWAKE_TAG)
    }
  }, [isOnRecordTab])
}
