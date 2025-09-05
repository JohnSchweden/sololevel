import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import { useCameraPermission, useMicrophonePermission } from 'react-native-vision-camera'
import { useCameraRecordingStore } from '../../../stores/cameraRecording'

// Global singleton to prevent multiple permission requests across all component instances
let globalPermissionRequestInProgress = false
let globalRationaleModalOpen = false

/**
 * VisionCamera-compatible permission response interface
 */
export interface VisionCameraPermissionResponse {
  granted: boolean
  status: 'granted' | 'denied' | 'undetermined'
  canAskAgain: boolean
}

/**
 * Enhanced camera permissions hook that wraps VisionCamera's useCameraPermission
 * with additional UX features, error handling, and Zustand integration
 */
export interface UseCameraPermissionsResult {
  // VisionCamera's original API (adapted)
  permission: VisionCameraPermissionResponse | null
  requestPermission: () => Promise<VisionCameraPermissionResponse>

  // Enhanced features
  isLoading: boolean
  error: string | null
  canRequestAgain: boolean

  // Actions
  requestPermissionWithRationale: () => Promise<boolean>
  redirectToSettings: () => Promise<void>
  clearError: () => void
  retryRequest: () => Promise<boolean>
}

/**
 * Configuration for the permissions hook
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
  onPermissionChange?: (status: VisionCameraPermissionResponse | null) => void
  /** Callback when permission request fails */
  onError?: (error: string) => void
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
  const {
    showRationale = true,
    enableSettingsRedirect = true,
    customRationale,
    onPermissionChange,
    onError,
  } = config

  // Use VisionCamera's hooks internally
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission()
  const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } =
    useMicrophonePermission()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Zustand store integration
  const { setPermissions } = useCameraRecordingStore()

  // Platform-specific rationale messages
  const getRationaleMessage = useCallback(() => {
    if (customRationale) return customRationale

    if (Platform.OS === 'ios') {
      return {
        title: 'Camera Access Required',
        message:
          'SoloLevel needs camera access to record your form and provide real-time feedback. Your privacy is protected - videos are processed locally and can be deleted anytime.',
        okButton: 'Allow Access',
        cancelButton: 'Not Now',
      }
    }

    if (Platform.OS === 'android') {
      return {
        title: 'Camera Permission',
        message:
          'SoloLevel requires camera access to capture your movement and provide AI-powered coaching. Videos are processed securely and you can delete them anytime.',
        okButton: 'Grant Permission',
        cancelButton: 'Cancel',
      }
    }

    // Web
    return {
      title: 'Enable Camera',
      message:
        'SoloLevel needs camera access to record your form. Click "Allow" when prompted by your browser.',
      okButton: 'Continue',
      cancelButton: 'Cancel',
    }
  }, [customRationale])

  // Convert VisionCamera permission to our interface
  const permission: VisionCameraPermissionResponse = {
    granted: hasCameraPermission,
    status: hasCameraPermission ? 'granted' : 'denied',
    canAskAgain: !hasCameraPermission, // VisionCamera doesn't provide canAskAgain, assume true if not granted
  }

  // Update Zustand store when permission changes
  useEffect(() => {
    // Map VisionCamera permission response to API schema format
    let mappedStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined'

    if (hasCameraPermission) {
      mappedStatus = 'granted'
    } else {
      mappedStatus = 'denied'
    }

    setPermissions({
      camera: mappedStatus,
      microphone: hasMicrophonePermission ? 'granted' : 'denied',
    })
    onPermissionChange?.(permission)
  }, [hasCameraPermission, hasMicrophonePermission, setPermissions, onPermissionChange, permission])

  // Check if we can request permission again
  const canRequestAgain = !hasCameraPermission

  // Show permission rationale modal
  const showRationaleModal = useCallback(async (): Promise<boolean> => {
    if (!showRationale) return true

    // Prevent multiple rationale modals globally
    if (globalRationaleModalOpen) {
      console.log('Rationale modal already open globally, skipping...')
      return false
    }

    globalRationaleModalOpen = true
    const rationale = getRationaleMessage()

    return new Promise((resolve) => {
      Alert.alert(rationale.title, rationale.message, [
        {
          text: rationale.cancelButton || 'Cancel',
          style: 'cancel',
          onPress: () => {
            globalRationaleModalOpen = false
            resolve(false)
          },
        },
        {
          text: rationale.okButton || 'OK',
          onPress: () => {
            globalRationaleModalOpen = false
            resolve(true)
          },
        },
      ])
    })
  }, [showRationale, getRationaleMessage])

  // Redirect to app settings
  const redirectToSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:')
      } else if (Platform.OS === 'android') {
        await Linking.openSettings()
      } else {
        // Web - show browser settings message
        Alert.alert(
          'Browser Settings',
          'Please enable camera access in your browser settings and refresh the page.',
          [{ text: 'OK' }]
        )
      }
    } catch (err) {
      const errorMessage =
        'Unable to open settings. Please manually enable camera access in your device settings.'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [onError])

  // Request permission with enhanced UX
  const requestPermissionWithRationale = useCallback(async (): Promise<boolean> => {
    // Prevent multiple concurrent permission requests globally
    if (globalPermissionRequestInProgress) {
      console.log('Permission request already in progress globally, skipping...')
      return false
    }

    // If permission is already granted, don't request again
    if (hasCameraPermission) {
      console.log('Permission already granted, skipping request...')
      return true
    }

    try {
      globalPermissionRequestInProgress = true
      setIsLoading(true)
      setError(null)

      console.log('Starting VisionCamera permission request flow...')

      // Show rationale modal first (if enabled)
      const shouldProceed = await showRationaleModal()
      if (!shouldProceed) {
        setIsLoading(false)
        return false
      }

      // Request both camera and microphone permissions
      const cameraResult = await requestCameraPermission()
      const microphoneResult = await requestMicrophonePermission()

      // Handle permission results
      if (cameraResult && microphoneResult) {
        console.log('VisionCamera permissions granted successfully')
        return true
      }

      // Handle denied permissions
      if (!cameraResult) {
        const errorMessage = 'Camera permission was denied. Please enable it in Settings.'
        setError(errorMessage)
        onError?.(errorMessage)

        if (enableSettingsRedirect) {
          Alert.alert(
            'Permission Required',
            'Camera access was denied. You can enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: redirectToSettings },
            ]
          )
        }
      }

      return false
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'VisionCamera permission request failed'
      setError(errorMessage)
      onError?.(errorMessage)
      return false
    } finally {
      setIsLoading(false)
      globalPermissionRequestInProgress = false
    }
  }, [
    requestCameraPermission,
    requestMicrophonePermission,
    showRationaleModal,
    enableSettingsRedirect,
    redirectToSettings,
    onError,
    hasCameraPermission,
  ])

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

  // Retry permission request
  const retryRequest = useCallback(async (): Promise<boolean> => {
    setError(null)
    return requestPermissionWithRationale()
  }, [requestPermissionWithRationale])

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

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

/**
 * Hook for handling permission modal visibility
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
