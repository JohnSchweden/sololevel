import { log } from '@my/logging'
import { Platform } from 'react-native'

/**
 * Check if device is currently online
 * Cross-platform network detection
 * @returns true if online, false if offline
 */
export async function isOnline(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // Web: Use navigator.onLine
      return typeof navigator !== 'undefined' && navigator.onLine === true
    }
    // React Native: Default to online (NetInfo requires package installation)
    // TODO: Add @react-native-community/netinfo for native offline detection
    log.debug('networkDetection', 'Native platform - defaulting to online', {
      platform: Platform.OS,
    })
    return true
  } catch (error) {
    log.warn('networkDetection', 'Failed to check network status', {
      error: error instanceof Error ? error.message : String(error),
      platform: Platform.OS,
    })
    // Default to online if check fails (graceful degradation)
    return true
  }
}

/**
 * Get user-friendly error message for network-related cache failures
 * @param operation - Cache operation that failed ('thumbnail' | 'video')
 * @param error - Original error
 * @returns User-friendly error message
 */
export async function getNetworkErrorMessage(
  operation: 'thumbnail' | 'video',
  error: unknown
): Promise<string> {
  const isDeviceOnline = await isOnline()

  if (!isDeviceOnline) {
    const operationName = operation === 'thumbnail' ? 'thumbnail' : 'video'
    return `Cannot load ${operationName}. You're currently offline. Please check your internet connection.`
  }

  // Online but error occurred - provide generic error
  const errorMessage = error instanceof Error ? error.message : String(error)
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return `Network error while loading ${operation === 'thumbnail' ? 'thumbnail' : 'video'}. Please try again.`
  }

  // Generic error
  return `Failed to load ${operation === 'thumbnail' ? 'thumbnail' : 'video'}. ${errorMessage}`
}
