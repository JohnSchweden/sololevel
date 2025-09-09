import { useCallback, useEffect } from 'react'
import { useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import {
  BasePermissionResponse,
  BaseUseCameraPermissionsResult,
  UseCameraPermissionsConfig,
  useBaseCameraPermissions,
  usePermissionModal,
} from './useCameraPermissions.native'

/**
 * VisionCamera-compatible permission response interface
 */
export interface VisionCameraPermissionResponse extends BasePermissionResponse {}

/**
 * Enhanced camera permissions hook that wraps VisionCamera's useCameraPermission
 * with additional UX features, error handling, and Zustand integration
 */
export interface UseCameraPermissionsResult extends BaseUseCameraPermissionsResult {
  // VisionCamera's original API (adapted)
  permission: VisionCameraPermissionResponse | null
  requestPermission: () => Promise<VisionCameraPermissionResponse>
}

/**
 * Custom camera permissions hook with enhanced UX for VisionCamera
 * Wraps VisionCamera's useCameraPermission with additional features:
 * - Platform-specific rationale messages
 * - Settings redirect for permanently denied permissions
 * - Loading states and error handling
 * - Retry logic
 * - Zustand store integration
 */
export function useCameraPermissions(
  config: UseCameraPermissionsConfig = {}
): UseCameraPermissionsResult {
  // Use VisionCamera's hooks internally
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()

  // Use base hook for shared functionality
  const {
    isLoading,
    error,
    requestPermissionWithRationale: baseRequestPermissionWithRationale,
    retryRequest: baseRetryRequest,
    clearError,
    redirectToSettings,
    updateStorePermissions,
  } = useBaseCameraPermissions<VisionCameraPermissionResponse>(config)

  // Convert VisionCamera permission to our interface
  const permission: VisionCameraPermissionResponse = {
    granted: hasCameraPermission,
    status: hasCameraPermission ? 'granted' : 'denied',
    canAskAgain: !hasCameraPermission, // VisionCamera doesn't provide canAskAgain, assume true if not granted
  }

  // Update Zustand store when permission changes
  useEffect(() => {
    updateStorePermissions(permission, hasMicrophonePermission)
  }, [hasCameraPermission, hasMicrophonePermission, updateStorePermissions, permission])

  // Check if we can request permission again
  const canRequestAgain = !hasCameraPermission

  // Request permission (simple version)
  const requestPermission = useCallback(async (): Promise<VisionCameraPermissionResponse> => {
    try {
      const cameraResult = await requestCameraPermission()
      const microphoneResult = await requestMicrophonePermission()

      return {
        granted: cameraResult && microphoneResult,
        status: cameraResult && microphoneResult ? 'granted' : 'denied',
        canAskAgain: !(cameraResult && microphoneResult),
      }
    } catch (err) {
      return {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      }
    }
  }, [requestCameraPermission, requestMicrophonePermission])

  // Request permission with enhanced UX
  const requestPermissionWithRationale = useCallback(async (): Promise<boolean> => {
    return baseRequestPermissionWithRationale(requestPermission, hasCameraPermission)
  }, [baseRequestPermissionWithRationale, requestPermission, hasCameraPermission])

  // Retry permission request
  const retryRequest = useCallback(async (): Promise<boolean> => {
    return baseRetryRequest(requestPermission, hasCameraPermission)
  }, [baseRetryRequest, requestPermission, hasCameraPermission])

  return {
    // VisionCamera's original API (adapted)
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
