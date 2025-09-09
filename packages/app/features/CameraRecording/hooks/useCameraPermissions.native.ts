import { useCallback, useState } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import { useCameraRecordingStore } from '../../../stores/cameraRecording'
import { useFeatureFlagsStore } from '../../../stores/feature-flags'

// Global singleton to prevent multiple permission requests across all component instances
let globalPermissionRequestInProgress = false
// let globalRationaleModalOpen = false // Commented out - not used when rationale modal is disabled

/**
 * Base permission response interface that can be extended by platform-specific implementations
 */
export interface BasePermissionResponse {
  granted: boolean
  status: 'granted' | 'denied' | 'undetermined'
  canAskAgain: boolean
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
  onPermissionChange?: (status: BasePermissionResponse | null) => void
  /** Callback when permission request fails */
  onError?: (error: string) => void
}

/**
 * Base result interface for camera permissions
 */
export interface BaseUseCameraPermissionsResult {
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
 * Generic camera permissions result interface
 */
export interface UseCameraPermissionsResult extends BaseUseCameraPermissionsResult {
  // Platform-specific permission API
  permission: BasePermissionResponse | null
  requestPermission: () => Promise<BasePermissionResponse>
}

/**
 * Shared base hook with common functionality for all camera permission implementations
 */
export function useBaseCameraPermissions<T extends BasePermissionResponse>(
  config: UseCameraPermissionsConfig = {}
) {
  const {
    showRationale = true,
    enableSettingsRedirect = true,
    customRationale,
    onPermissionChange,
    onError,
  } = config

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Zustand store integration
  const { setPermissions } = useCameraRecordingStore()

  // Platform-specific rationale messages (commented out - native system handles messaging)
  const getRationaleMessage = useCallback(() => {
    if (customRationale) return customRationale

    // Return undefined when no custom rationale is provided - native system handles messaging
    return undefined

    // Custom platform-specific messages (commented out for later use)
    /*
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
    */
  }, [customRationale])

  // Update Zustand store when permission changes
  const updateStorePermissions = useCallback(
    (permission: T | null, microphonePermission?: boolean) => {
      if (permission) {
        // Map permission response to API schema format
        let mappedStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined'

        if (permission.granted) {
          mappedStatus = 'granted'
        } else if (permission.status === 'denied') {
          mappedStatus = 'denied'
        } else if (permission.status === 'undetermined') {
          mappedStatus = 'undetermined'
        }

        setPermissions({
          camera: mappedStatus,
          microphone:
            microphonePermission !== undefined
              ? microphonePermission
                ? 'granted'
                : 'denied'
              : 'undetermined',
        })
        onPermissionChange?.(permission)
      }
    },
    [setPermissions, onPermissionChange]
  )

  // Show permission rationale modal (disabled - native system handles messaging)
  const showRationaleModal = useCallback(async (): Promise<boolean> => {
    // Native permission system handles messaging - skip custom rationale
    return true

    // Custom rationale modal (commented out - native system handles messaging)
    /*
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
    */
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

  // Request permission with enhanced UX (to be implemented by platform-specific hooks)
  const requestPermissionWithRationale = useCallback(
    async (requestPermissionFn: () => Promise<T>, isAlreadyGranted: boolean): Promise<boolean> => {
      // Prevent multiple concurrent permission requests globally
      if (globalPermissionRequestInProgress) {
        console.log('Permission request already in progress globally, skipping...')
        return false
      }

      // If permission is already granted, don't request again
      if (isAlreadyGranted) {
        console.log('Permission already granted, skipping request...')
        return true
      }

      try {
        globalPermissionRequestInProgress = true
        setIsLoading(true)
        setError(null)

        console.log('Starting permission request flow...')

        // Show rationale modal first (if enabled)
        const shouldProceed = await showRationaleModal()
        if (!shouldProceed) {
          setIsLoading(false)
          return false
        }

        // Request permission using platform-specific function
        const result = await requestPermissionFn()

        // Handle different permission states
        if (result.granted) {
          console.log('Permission granted successfully')
          return true
        }

        if (!result.canAskAgain) {
          // Permanently denied - offer settings redirect
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
          return false
        }

        // Permission denied but can ask again later
        if (result.status === 'denied') {
          const errorMessage = 'Camera permission was denied. Please try again later.'
          setError(errorMessage)
          onError?.(errorMessage)
        }

        return false
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Permission request failed'
        setError(errorMessage)
        onError?.(errorMessage)
        return false
      } finally {
        setIsLoading(false)
        globalPermissionRequestInProgress = false
      }
    },
    [showRationaleModal, enableSettingsRedirect, redirectToSettings, onError]
  )

  // Retry permission request
  const retryRequest = useCallback(
    async (requestPermissionFn: () => Promise<T>, isAlreadyGranted: boolean): Promise<boolean> => {
      setError(null)
      return requestPermissionWithRationale(requestPermissionFn, isAlreadyGranted)
    },
    [requestPermissionWithRationale]
  )

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,

    // Actions
    showRationaleModal,
    redirectToSettings,
    requestPermissionWithRationale,
    retryRequest,
    clearError,
    updateStorePermissions,
  }
}

/**
 * Wrapper component that handles feature flag routing for camera permissions
 * This prevents Rules of Hooks violations by ensuring React never sees different hook structures
 */
export function useCameraPermissions(
  config: UseCameraPermissionsConfig = {}
): UseCameraPermissionsResult {
  const { flags } = useFeatureFlagsStore()

  // Determine implementation at the top level, before any other hooks
  if (flags.useVisionCamera) {
    // Dynamically import VisionCamera implementation
    const {
      useCameraPermissions: useVisionCameraPermissions,
    } = require('./useCameraPermissions.native.vision')
    return useVisionCameraPermissions(config)
  }

  // Dynamically import Expo Camera implementation
  const {
    useCameraPermissions: useExpoCameraPermissions,
  } = require('./useCameraPermissions.native.expo')
  return useExpoCameraPermissions(config)
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
