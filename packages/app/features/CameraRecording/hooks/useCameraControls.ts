import { useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'

export interface CameraControlsState {
  cameraType: 'front' | 'back'
  zoomLevel: 1 | 2 | 3
  flashEnabled: boolean
  gridEnabled: boolean
  isSwapping: boolean
}

export interface CameraControlsActions {
  swapCamera: () => Promise<void>
  setZoomLevel: (level: 1 | 2 | 3) => void
  toggleFlash: () => void
  toggleGrid: () => void
  resetSettings: () => void
}

export interface UseCameraControlsResult {
  controls: CameraControlsState
  actions: CameraControlsActions
  canSwapCamera: boolean
}

interface UseCameraControlsConfig {
  initialCameraType?: 'front' | 'back'
  allowCameraSwapDuringRecording?: boolean
  onCameraSwap?: (newType: 'front' | 'back') => void
  onZoomChange?: (level: 1 | 2 | 3) => void
  onError?: (error: string) => void
}

/**
 * Camera Controls Hook
 * Manages camera settings and interactions
 * Implements US-RU-09a/09b: Camera controls — swap and zoom
 */
export function useCameraControls(config: UseCameraControlsConfig = {}): UseCameraControlsResult {
  const {
    initialCameraType = 'back',
    allowCameraSwapDuringRecording = false,
    onCameraSwap,
    onZoomChange,
    onError,
  } = config

  const [controls, setControls] = useState<CameraControlsState>({
    cameraType: initialCameraType,
    zoomLevel: 1,
    flashEnabled: false,
    gridEnabled: false,
    isSwapping: false,
  })

  const swapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Swap camera between front and back
  const swapCamera = useCallback(async () => {
    if (controls.isSwapping) {
      return // Prevent double-taps
    }

    try {
      setControls((prev) => ({ ...prev, isSwapping: true }))

      const newCameraType = controls.cameraType === 'front' ? 'back' : 'front'

      // Add small delay for smooth UX
      await new Promise((resolve) => {
        swapTimeoutRef.current = setTimeout(resolve, 200)
      })

      setControls((prev) => ({
        ...prev,
        cameraType: newCameraType,
        zoomLevel: 1, // Reset zoom when swapping
        isSwapping: false,
      }))

      onCameraSwap?.(newCameraType)
    } catch (error) {
      console.error('Failed to swap camera:', error)
      setControls((prev) => ({ ...prev, isSwapping: false }))
      onError?.(error instanceof Error ? error.message : 'Failed to swap camera')
    }
  }, [controls.cameraType, controls.isSwapping, onCameraSwap, onError])

  // Set zoom level with validation
  const setZoomLevel = useCallback(
    (level: 1 | 2 | 3) => {
      if (level === controls.zoomLevel) {
        return // No change needed
      }

      try {
        setControls((prev) => ({ ...prev, zoomLevel: level }))
        onZoomChange?.(level)
      } catch (error) {
        console.error('Failed to set zoom level:', error)
        onError?.(error instanceof Error ? error.message : 'Failed to change zoom')
      }
    },
    [controls.zoomLevel, onZoomChange, onError]
  )

  // Toggle flash
  const toggleFlash = useCallback(() => {
    try {
      const newFlashState = !controls.flashEnabled
      setControls((prev) => ({ ...prev, flashEnabled: newFlashState }))
    } catch (error) {
      console.error('Failed to toggle flash:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to toggle flash')
    }
  }, [controls.flashEnabled, onError])

  // Toggle grid lines
  const toggleGrid = useCallback(() => {
    try {
      const newGridState = !controls.gridEnabled
      setControls((prev) => ({ ...prev, gridEnabled: newGridState }))
    } catch (error) {
      console.error('Failed to toggle grid:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to toggle grid lines')
    }
  }, [controls.gridEnabled, onError])

  // Reset all settings to default
  const resetSettings = useCallback(() => {
    try {
      setControls({
        cameraType: initialCameraType,
        zoomLevel: 1,
        flashEnabled: false,
        gridEnabled: false,
        isSwapping: false,
      })
    } catch (error) {
      console.error('Failed to reset settings:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to reset settings')
    }
  }, [initialCameraType, onError])

  // Determine if camera swap is available
  const canSwapCamera =
    !controls.isSwapping &&
    (allowCameraSwapDuringRecording ||
      Platform.OS === 'web' || // Web generally allows camera swap
      true) // Most mobile devices support both cameras

  // Cleanup on unmount
  useState(() => {
    return () => {
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current)
      }
    }
  })

  return {
    controls,
    actions: {
      swapCamera,
      setZoomLevel,
      toggleFlash,
      toggleGrid,
      resetSettings,
    },
    canSwapCamera,
  }
}

// Camera settings validation
export function validateCameraSettings(settings: Partial<CameraControlsState>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (settings.cameraType && !['front', 'back'].includes(settings.cameraType)) {
    errors.push('Camera type must be "front" or "back"')
  }

  if (settings.zoomLevel && ![1, 2, 3].includes(settings.zoomLevel)) {
    errors.push('Zoom level must be 1, 2, or 3')
  }

  if (settings.flashEnabled !== undefined && typeof settings.flashEnabled !== 'boolean') {
    errors.push('Flash enabled must be a boolean')
  }

  if (settings.gridEnabled !== undefined && typeof settings.gridEnabled !== 'boolean') {
    errors.push('Grid enabled must be a boolean')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Platform-specific camera capabilities
export function getCameraCapabilities() {
  if (Platform.OS === 'web') {
    return {
      supportsFrontCamera: true,
      supportsBackCamera: true,
      supportsZoom: true,
      supportsFlash: false, // Generally not supported in web browsers
      maxZoomLevel: 3,
    }
  }

  // Native capabilities (would be enhanced with actual device detection)
  return {
    supportsFrontCamera: true,
    supportsBackCamera: true,
    supportsZoom: true,
    supportsFlash: true,
    maxZoomLevel: 3,
  }
}

// Smooth camera transition helper
export async function performCameraTransition(
  operation: () => Promise<void>,
  duration = 300
): Promise<void> {
  try {
    // Could add visual transitions here (fade out/in, etc.)
    await operation()

    // Brief delay for smooth UX
    await new Promise((resolve) => setTimeout(resolve, duration))
  } catch (error) {
    console.error('Camera transition failed:', error)
    throw error
  }
}
