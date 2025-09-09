import { useCameraPermissions as useExpoCameraPermissions } from 'expo-camera'
import { PermissionResponse } from 'expo-camera'
import { useCallback, useEffect } from 'react'
import {
  BaseUseCameraPermissionsResult,
  UseCameraPermissionsConfig,
  useBaseCameraPermissions,
  usePermissionModal,
} from './useCameraPermissions.native'

/**
 * Enhanced camera permissions hook that wraps Expo's useCameraPermissions
 * with additional UX features, error handling, and Zustand integration
 */
export interface UseCameraPermissionsResult extends BaseUseCameraPermissionsResult {
  // Expo's original API
  permission: PermissionResponse | null
  requestPermission: () => Promise<PermissionResponse>
}

/**
 * Custom camera permissions hook with enhanced UX
 * Wraps Expo's useCameraPermissions with additional features:
 * - Platform-specific rationale messages
 * - Settings redirect for permanently denied permissions
 * - Loading states and error handling
 * - Retry logic
 * - Zustand store integration
 */
export function useCameraPermissions(
  config: UseCameraPermissionsConfig = {}
): UseCameraPermissionsResult {
  // Use Expo's hook internally
  const [permission, requestPermission] = useExpoCameraPermissions()

  // Use base hook for shared functionality
  const {
    isLoading,
    error,
    requestPermissionWithRationale: baseRequestPermissionWithRationale,
    retryRequest: baseRetryRequest,
    clearError,
    redirectToSettings,
    updateStorePermissions,
  } = useBaseCameraPermissions<PermissionResponse>(config)

  // Update Zustand store when permission changes
  useEffect(() => {
    if (permission) {
      updateStorePermissions(permission)
    }
  }, [permission, updateStorePermissions])

  // Check if we can request permission again
  const canRequestAgain = permission?.canAskAgain ?? false

  // Request permission with enhanced UX
  const requestPermissionWithRationale = useCallback(async (): Promise<boolean> => {
    return baseRequestPermissionWithRationale(requestPermission, permission?.granted ?? false)
  }, [baseRequestPermissionWithRationale, requestPermission, permission?.granted])

  // Retry permission request
  const retryRequest = useCallback(async (): Promise<boolean> => {
    return baseRetryRequest(requestPermission, permission?.granted ?? false)
  }, [baseRetryRequest, requestPermission, permission?.granted])

  return {
    // Expo's original API
    permission,
    requestPermission,

    // Enhanced features
    isLoading,
    error,
    canRequestAgain,

    // Enhanced actions
    requestPermissionWithRationale,
    redirectToSettings,
    clearError,
    retryRequest,
  }
}

/**
 * Hook for checking if camera permissions are granted
 */
export function useCameraPermissionStatus() {
  const { permission } = useCameraPermissions()
  return {
    isGranted: permission?.granted ?? false,
    isDenied: permission?.status === 'denied',
    isUndetermined: permission?.status === 'undetermined',
    canAskAgain: permission?.status === 'undetermined' || !permission?.granted,
  }
}

// Re-export the permission modal hook from base
export { usePermissionModal }
