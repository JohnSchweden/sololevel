import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Platform } from 'react-native'
import { CameraPermissionStatus } from '../types'

interface CameraPermissionsState {
  camera: CameraPermissionStatus
  microphone: CameraPermissionStatus
  isLoading: boolean
  error: string | null
}

interface CameraPermissionsActions {
  requestCameraPermission: () => Promise<boolean>
  requestMicrophonePermission: () => Promise<boolean>
  requestAllPermissions: () => Promise<boolean>
  openSettings: () => void
  showPermissionRationale: (type: 'camera' | 'microphone') => void
}

export interface UseCameraPermissionsResult {
  permissions: CameraPermissionsState
  actions: CameraPermissionsActions
  hasAllPermissions: boolean
  canRecord: boolean
}

/**
 * Camera Permissions Management Hook
 * Handles camera/microphone permission requests with proper rationale modals
 * Implements US-RU-02: Handle permissions gracefully
 */
export function useCameraPermissions(): UseCameraPermissionsResult {
  const [permissions, setPermissions] = useState<CameraPermissionsState>({
    camera: CameraPermissionStatus.UNDETERMINED,
    microphone: CameraPermissionStatus.UNDETERMINED,
    isLoading: false,
    error: null,
  })

  // Check current permissions on mount
  useEffect(() => {
    checkCurrentPermissions()
  }, [])

  const checkCurrentPermissions = useCallback(async () => {
    setPermissions((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      if (Platform.OS === 'web') {
        // Web getUserMedia permissions are handled differently
        const cameraStatus = await checkWebCameraPermission()
        const microphoneStatus = await checkWebMicrophonePermission()

        setPermissions({
          camera: cameraStatus,
          microphone: microphoneStatus,
          isLoading: false,
          error: null,
        })
      } else {
        // Native permissions using expo-camera
        const { Camera } = await import('expo-camera')
        const cameraStatus = await Camera.getCameraPermissionsAsync()
        const microphoneStatus = await Camera.getMicrophonePermissionsAsync()

        setPermissions({
          camera: mapNativePermissionStatus(cameraStatus.status),
          microphone: mapNativePermissionStatus(microphoneStatus.status),
          isLoading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('Error checking camera permissions:', error)
      setPermissions((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check camera permissions',
      }))
    }
  }, [])

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    setPermissions((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      if (Platform.OS === 'web') {
        const granted = await requestWebCameraPermission()
        setPermissions((prev) => ({
          ...prev,
          camera: granted ? CameraPermissionStatus.GRANTED : CameraPermissionStatus.DENIED,
          isLoading: false,
        }))
        return granted
      }

      const { Camera } = await import('expo-camera')
      const { status } = await Camera.requestCameraPermissionsAsync()
      const permissionStatus = mapNativePermissionStatus(status)

      setPermissions((prev) => ({
        ...prev,
        camera: permissionStatus,
        isLoading: false,
      }))

      return permissionStatus === CameraPermissionStatus.GRANTED
    } catch (error) {
      console.error('Error requesting camera permission:', error)
      setPermissions((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request camera permission',
      }))
      return false
    }
  }, [])

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    setPermissions((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      if (Platform.OS === 'web') {
        const granted = await requestWebMicrophonePermission()
        setPermissions((prev) => ({
          ...prev,
          microphone: granted ? CameraPermissionStatus.GRANTED : CameraPermissionStatus.DENIED,
          isLoading: false,
        }))
        return granted
      }

      const { Camera } = await import('expo-camera')
      const { status } = await Camera.requestMicrophonePermissionsAsync()
      const permissionStatus = mapNativePermissionStatus(status)

      setPermissions((prev) => ({
        ...prev,
        microphone: permissionStatus,
        isLoading: false,
      }))

      return permissionStatus === CameraPermissionStatus.GRANTED
    } catch (error) {
      console.error('Error requesting microphone permission:', error)
      setPermissions((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request microphone permission',
      }))
      return false
    }
  }, [])

  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    const cameraGranted = await requestCameraPermission()
    const microphoneGranted = await requestMicrophonePermission()
    return cameraGranted && microphoneGranted
  }, [requestCameraPermission, requestMicrophonePermission])

  const openSettings = useCallback(() => {
    if (Platform.OS === 'web') {
      // Web browsers handle this in their permission UI
      window.alert('Please enable camera and microphone permissions in your browser settings')
    } else {
      Linking.openSettings()
    }
  }, [])

  const showPermissionRationale = useCallback(
    (type: 'camera' | 'microphone') => {
      const title =
        type === 'camera' ? 'Camera Permission Required' : 'Microphone Permission Required'
      const message =
        type === 'camera'
          ? 'This app needs camera access to record videos for AI analysis. Please grant camera permission to continue.'
          : 'This app needs microphone access to record audio with your videos. Please grant microphone permission to continue.'

      Alert.alert(title, message, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: openSettings,
        },
      ])
    },
    [openSettings]
  )

  // Computed properties
  const hasAllPermissions =
    permissions.camera === CameraPermissionStatus.GRANTED &&
    permissions.microphone === CameraPermissionStatus.GRANTED

  const canRecord = hasAllPermissions && !permissions.isLoading

  return {
    permissions,
    actions: {
      requestCameraPermission,
      requestMicrophonePermission,
      requestAllPermissions,
      openSettings,
      showPermissionRationale,
    },
    hasAllPermissions,
    canRecord,
  }
}

// Helper functions
function mapNativePermissionStatus(status: string): CameraPermissionStatus {
  switch (status) {
    case 'granted':
      return CameraPermissionStatus.GRANTED
    case 'denied':
      return CameraPermissionStatus.DENIED
    case 'undetermined':
      return CameraPermissionStatus.UNDETERMINED
    default:
      return CameraPermissionStatus.RESTRICTED
  }
}

async function checkWebCameraPermission(): Promise<CameraPermissionStatus> {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as any })
    switch (result.state) {
      case 'granted':
        return CameraPermissionStatus.GRANTED
      case 'denied':
        return CameraPermissionStatus.DENIED
      case 'prompt':
        return CameraPermissionStatus.UNDETERMINED
      default:
        return CameraPermissionStatus.UNDETERMINED
    }
  } catch {
    return CameraPermissionStatus.UNDETERMINED
  }
}

async function checkWebMicrophonePermission(): Promise<CameraPermissionStatus> {
  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as any,
    })
    switch (result.state) {
      case 'granted':
        return CameraPermissionStatus.GRANTED
      case 'denied':
        return CameraPermissionStatus.DENIED
      case 'prompt':
        return CameraPermissionStatus.UNDETERMINED
      default:
        return CameraPermissionStatus.UNDETERMINED
    }
  } catch {
    return CameraPermissionStatus.UNDETERMINED
  }
}

async function requestWebCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach((track) => track.stop()) // Clean up
    return true
  } catch {
    return false
  }
}

async function requestWebMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop()) // Clean up
    return true
  } catch {
    return false
  }
}
