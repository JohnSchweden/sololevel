import { useCameraPermissions as useExpoCameraPermissions } from 'expo-camera'
import { PermissionResponse } from 'expo-camera'
import { useCallback, useEffect, useMemo } from 'react'
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

  // Stabilize permission object reference - Expo may return new object even when values don't change
  // Extract primitive values to break reference equality dependency
  const hasPermission = permission !== null
  const permissionGranted = permission?.granted ?? false
  const permissionStatus = permission?.status ?? 'undetermined'
  const permissionCanAskAgain = permission?.canAskAgain ?? false
  const permissionExpires = permission?.expires

  const stablePermission = useMemo(() => {
    if (!hasPermission) return null
    // Create new object with same values to break reference dependency on Expo's object
    return {
      granted: permissionGranted,
      status: permissionStatus,
      canAskAgain: permissionCanAskAgain,
      expires: permissionExpires,
    } as PermissionResponse
  }, [hasPermission, permissionGranted, permissionStatus, permissionCanAskAgain, permissionExpires])

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
    if (stablePermission) {
      updateStorePermissions(stablePermission)
    }
  }, [stablePermission, updateStorePermissions])

  // Check if we can request permission again
  const canRequestAgain = stablePermission?.canAskAgain ?? false

  // Request permission with enhanced UX
  const requestPermissionWithRationale = useCallback(async (): Promise<boolean> => {
    return baseRequestPermissionWithRationale(requestPermission, stablePermission?.granted ?? false)
  }, [baseRequestPermissionWithRationale, requestPermission, stablePermission?.granted])

  // Retry permission request
  const retryRequest = useCallback(async (): Promise<boolean> => {
    return baseRetryRequest(requestPermission, stablePermission?.granted ?? false)
  }, [baseRetryRequest, requestPermission, stablePermission?.granted])

  // Memoize return object to prevent unnecessary re-renders in consumers
  // Permission object reference from Expo may change even when values are stable
  return useMemo(
    () => ({
      // Expo's original API
      permission: stablePermission,
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
    }),
    [
      stablePermission,
      requestPermission,
      isLoading,
      error,
      canRequestAgain,
      requestPermissionWithRationale,
      redirectToSettings,
      clearError,
      retryRequest,
    ]
  )
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
