// eslint-disable-next-line deprecation/deprecation
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake'
import { usePathname } from 'expo-router'
import { useEffect, useRef } from 'react'

/**
 * Hook to keep the screen awake only when on the CameraRecording (record) tab
 *
 * Properly handles Expo Router tabs that stay mounted by using reference tracking
 * to ensure each activate has exactly one matching deactivate.
 */
export const useKeepAwake = () => {
  // Check if we're in a test environment
  const isTestEnvironment = process.env.NODE_ENV === 'test' || typeof jest !== 'undefined'

  // Track if we've activated keep-awake to ensure proper cleanup
  const isActivatedRef = useRef(false)

  // Get current pathname to check if we're on the record tab
  const pathname = usePathname()
  const isOnRecordTab = pathname?.includes('/(tabs)/record') || pathname === '/record'

  if (isTestEnvironment) {
    // In test environment, do nothing
    return
  }

  useEffect(() => {
    if (isOnRecordTab) {
      // We're on the record tab - activate keep-awake if not already activated
      if (!isActivatedRef.current) {
        // eslint-disable-next-line deprecation/deprecation
        activateKeepAwake()
        isActivatedRef.current = true
      }
    } else {
      // We're NOT on the record tab - deactivate keep-awake if currently activated
      if (isActivatedRef.current) {
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake()
        isActivatedRef.current = false
      }
    }

    // Cleanup on unmount: ensure keep-awake is deactivated
    return () => {
      if (isActivatedRef.current) {
        // eslint-disable-next-line deprecation/deprecation
        deactivateKeepAwake()
        isActivatedRef.current = false
      }
    }
  }, [isOnRecordTab])
}
