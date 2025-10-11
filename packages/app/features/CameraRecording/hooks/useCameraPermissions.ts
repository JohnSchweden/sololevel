import { useCallback, useEffect, useState } from 'react'
import { useCameraRecordingStore } from '../stores/cameraRecording'

/**
 * Web stub implementation of camera permissions hook
 * Provides a minimal interface that matches the native version but with no-op implementations
 */

// Match the type from expo-camera for consistency
type PermissionResponse = {
  granted: boolean
  status: string
  canAskAgain: boolean
}

export interface UseCameraPermissionsResult {
  // Expo's original API (stubbed)
  permission: PermissionResponse | null
  requestPermission: () => Promise<PermissionResponse>

  // Enhanced features (stubbed)
  isLoading: boolean
  error: string | null
  canRequestAgain: boolean

  // Actions (stubbed)
  requestPermissionWithRationale: () => Promise<boolean>
  redirectToSettings: () => Promise<void>
  clearError: () => void
  retryRequest: () => Promise<boolean>
}

/**
 * Configuration for the permissions hook (ignored in web version)
 */
export interface UseCameraPermissionsConfig {
  /** Show permission rationale modal before requesting */
  showRationale?: boolean
  /** Enable automatic settings redirect for denied permissions */
  enableSettingsRedirect?: boolean
  /** Custom rationale message for different platforms */
  customRationale?: {
    title: string
    message: string
    okButton?: string
    cancelButton?: string
  }
  /** Callback when permission status changes */
  onPermissionChange?: (status: PermissionResponse | null) => void
  /** Callback when permission request fails */
  onError?: (error: string) => void
}

/**
 * Web stub implementation of camera permissions hook
 * Returns always-denied state to prevent camera access attempts
 */
export function useCameraPermissions(
  config: UseCameraPermissionsConfig = {}
): UseCameraPermissionsResult {
  const { onPermissionChange, onError } = config
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Always return denied permission on web
  const permission: PermissionResponse = {
    granted: false,
    status: 'denied',
    canAskAgain: false,
  }
  const canRequestAgain = false

  // Zustand store integration
  const { setPermissions, permissions: storePermissions } = useCameraRecordingStore()

  // Update Zustand store when component mounts
  useEffect(() => {
    setPermissions({
      camera: 'denied', // Web always denied
      microphone: storePermissions.microphone, // Keep existing microphone permission
    })
    onPermissionChange?.(permission)
  }, [setPermissions, storePermissions.microphone, onPermissionChange])

  // Stub implementations that do nothing
  const requestPermission = useCallback(async () => {
    const errorMessage = 'Camera permissions are not available in web browser'
    setError(errorMessage)
    onError?.(errorMessage)
    return permission
  }, [permission, onError])

  const requestPermissionWithRationale = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    const errorMessage = 'Camera permissions are not available in web browser'
    setError(errorMessage)
    onError?.(errorMessage)
    setIsLoading(false)
    return false
  }, [onError])

  const redirectToSettings = useCallback(async (): Promise<void> => {
    // Open browser settings (improved cross-browser support)
    try {
      // Detect browser and open appropriate settings
      const userAgent = window.navigator.userAgent.toLowerCase()

      if (userAgent.includes('chrome')) {
        window.open('chrome://settings/content/camera', '_blank')
      } else if (userAgent.includes('firefox')) {
        window.open('about:preferences#privacy', '_blank')
      } else if (userAgent.includes('safari')) {
        // Safari doesn't support direct settings URLs
        alert('Please open Safari Preferences > Websites > Camera to enable permissions')
      } else {
        // Generic instructions
        alert('Please check your browser settings to enable camera permissions')
      }
    } catch (err) {
      const errorMessage =
        'Unable to open browser settings. Please enable camera permissions manually.'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [onError])

  const retryRequest = useCallback(async (): Promise<boolean> => {
    return requestPermissionWithRationale()
  }, [requestPermissionWithRationale])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // Expo's original API (stubbed)
    permission,
    requestPermission,

    // Enhanced features (stubbed)
    isLoading,
    error,
    canRequestAgain,

    // Enhanced actions (stubbed)
    requestPermissionWithRationale,
    redirectToSettings,
    clearError,
    retryRequest,
  }
}

/**
 * Hook for checking if camera permissions are granted (always false on web)
 */
export function useCameraPermissionStatus() {
  const { permission } = useCameraPermissions()
  return {
    isGranted: permission?.granted ?? false,
    isDenied: permission?.status === 'denied',
    isUndetermined: permission?.status === 'undetermined',
    canAskAgain: permission?.canAskAgain ?? false,
  }
}

/**
 * Hook for handling permission modal visibility (no-op on web)
 */
export function usePermissionModal() {
  const { setPermissionModalOpen, showPermissionModal } = useCameraRecordingStore()

  const openModal = useCallback(() => {
    setPermissionModalOpen(true)
  }, [setPermissionModalOpen])

  const closeModal = useCallback(() => {
    setPermissionModalOpen(false)
  }, [setPermissionModalOpen])

  return {
    isVisible: showPermissionModal,
    openModal,
    closeModal,
  }
}
