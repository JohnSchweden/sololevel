/**
 * MVP Pose Detection Toggle Hook
 * Simple hook to enable/disable pose detection functionality
 * Integrates with camera recording state for seamless MVP experience
 */

import { log } from '@my/ui/src/utils/logger'
import { useCallback, useState } from 'react'
import { useCameraRecordingStore } from '../../../stores/cameraRecording'

/**
 * MVP Pose Toggle State Interface
 */
export interface MVPPoseToggleState {
  isEnabled: boolean
  isChanging: boolean
  canToggle: boolean
  error: string | null
}

/**
 * MVP Pose Toggle Hook Interface
 */
export interface UseMVPPoseToggle {
  // State
  state: MVPPoseToggleState
  isEnabled: boolean
  canToggle: boolean

  // Actions
  enablePoseDetection: () => Promise<void>
  disablePoseDetection: () => Promise<void>
  togglePoseDetection: () => Promise<void>

  // Error handling
  clearError: () => void
}

/**
 * MVP Pose Detection Toggle Hook
 * Provides simple enable/disable functionality for pose detection
 */
export function useMVPPoseToggle(initialEnabled = true): UseMVPPoseToggle {
  // Basic toggle state
  const [state, setState] = useState<MVPPoseToggleState>({
    isEnabled: initialEnabled,
    isChanging: false,
    canToggle: true,
    error: null,
  })

  // Get camera recording state to determine if we can toggle
  const { recordingState, permissions } = useCameraRecordingStore()

  // Update canToggle based on camera state
  const canToggle =
    permissions.camera === 'granted' &&
    (recordingState === 'idle' || recordingState === 'recording')

  /**
   * Enable pose detection
   */
  const enablePoseDetection = useCallback(async (): Promise<void> => {
    if (state.isChanging || state.isEnabled) {
      return
    }

    setState((prev) => ({
      ...prev,
      isChanging: true,
      error: null,
    }))

    try {
      // Mock enable delay for MVP (simulates model initialization)
      await new Promise((resolve) => setTimeout(resolve, 200))

      setState((prev) => ({
        ...prev,
        isEnabled: true,
        isChanging: false,
      }))

      log.info('MVP pose detection enabled')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to enable pose detection'
      setState((prev) => ({
        ...prev,
        isChanging: false,
        error: errorMessage,
      }))

      log.error('Failed to enable MVP pose detection:', error)
      throw error
    }
  }, [state.isChanging, state.isEnabled])

  /**
   * Disable pose detection
   */
  const disablePoseDetection = useCallback(async (): Promise<void> => {
    if (state.isChanging || !state.isEnabled) {
      return
    }

    setState((prev) => ({
      ...prev,
      isChanging: true,
      error: null,
    }))

    try {
      // Mock disable delay for MVP (simulates cleanup)
      await new Promise((resolve) => setTimeout(resolve, 100))

      setState((prev) => ({
        ...prev,
        isEnabled: false,
        isChanging: false,
      }))

      log.info('MVP pose detection disabled')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to disable pose detection'
      setState((prev) => ({
        ...prev,
        isChanging: false,
        error: errorMessage,
      }))

      log.error('Failed to disable MVP pose detection:', error)
      throw error
    }
  }, [state.isChanging, state.isEnabled])

  /**
   * Toggle pose detection on/off
   */
  const togglePoseDetection = useCallback(async (): Promise<void> => {
    if (!canToggle || state.isChanging) {
      return
    }

    if (state.isEnabled) {
      await disablePoseDetection()
    } else {
      await enablePoseDetection()
    }
  }, [canToggle, state.isChanging, state.isEnabled, enablePoseDetection, disablePoseDetection])

  /**
   * Clear any error state
   */
  const clearError = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Update state based on camera permissions and recording state
  const updatedState: MVPPoseToggleState = {
    ...state,
    canToggle,
  }

  return {
    // State
    state: updatedState,
    isEnabled: state.isEnabled,
    canToggle,

    // Actions
    enablePoseDetection,
    disablePoseDetection,
    togglePoseDetection,

    // Error handling
    clearError,
  }
}

/**
 * MVP Pose Toggle Utilities
 */
export const MVPPoseToggleUtils = {
  /**
   * Check if pose detection can be toggled based on current state
   */
  canTogglePoseDetection: (recordingState: string, cameraPermission: string): boolean => {
    return (
      cameraPermission === 'granted' &&
      (recordingState === 'idle' || recordingState === 'recording')
    )
  },

  /**
   * Get toggle button text based on current state
   */
  getToggleButtonText: (isEnabled: boolean, isChanging: boolean): string => {
    if (isChanging) {
      return isEnabled ? 'Disabling...' : 'Enabling...'
    }
    return isEnabled ? 'Disable Pose Detection' : 'Enable Pose Detection'
  },

  /**
   * Get toggle status description
   */
  getStatusDescription: (
    isEnabled: boolean,
    canToggle: boolean,
    recordingState: string
  ): string => {
    if (!canToggle) {
      if (recordingState === 'paused') {
        return 'Pose detection unavailable while recording is paused'
      }
      if (recordingState === 'stopped') {
        return 'Pose detection unavailable while recording is stopped'
      }
      return 'Camera permission required for pose detection'
    }

    return isEnabled ? 'Pose detection is active' : 'Pose detection is inactive'
  },

  /**
   * Get appropriate icon name for toggle button
   */
  getToggleIconName: (isEnabled: boolean, isChanging: boolean): string => {
    if (isChanging) {
      return 'refresh-cw' // spinning/loading icon
    }
    return isEnabled ? 'eye-off' : 'eye' // show/hide icons
  },
}
