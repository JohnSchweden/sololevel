import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RecordingState } from '../types'

// Platform-agnostic alert function
const showAlert = (title: string, message: string) => {
  // Simple platform detection without hydration issues
  const hasWindow = typeof window !== 'undefined'

  if (hasWindow) {
    // Use window.alert for web to avoid console linting issues
    if (typeof window.alert === 'function') {
      window.alert(`${title}: ${message}`)
    }
    return
  }

  // On native, use Alert if available
  try {
    const ReactNative = require('react-native')
    if (ReactNative?.Alert) {
      ReactNative.Alert.alert(title, message, [{ text: 'OK' }])
    }
  } catch {
    // Silent fallback for environments without alert capabilities
  }
}

interface CameraControls {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => Promise<void>
  resumeRecording: () => Promise<void>
  isReady: boolean
}

interface RecordingStateMachineConfig {
  maxDurationMs: number
  cameraControls?: CameraControls
  onMaxDurationReached?: () => void
  onStateChange?: (state: RecordingState, duration: number) => void
  onError?: (error: string) => void
  onResetZoom?: () => void
}

interface RecordingStateMachineResult {
  // State
  recordingState: RecordingState
  duration: number
  isAtMaxDuration: boolean

  // Actions
  startRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  resetRecording: () => void

  // Computed
  remainingTime: number
  formattedDuration: string
  canRecord: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
}

/**
 * Recording State Machine Hook
 * Manages recording state transitions with 60s timer enforcement
 * Implements US-RU-01: Record video up to 60 seconds with hard limit
 */
export function useRecordingStateMachine(
  config: RecordingStateMachineConfig
): RecordingStateMachineResult {
  const {
    maxDurationMs,
    cameraControls,
    onMaxDurationReached,
    onStateChange,
    onError,
    onResetZoom,
  } = config

  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pausedDuration, setPausedDuration] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | number | null>(null)

  // Use ref for duration to prevent callback recreation during recording
  // Callbacks only need to read current duration, not recreate when it changes
  const durationRef = useRef(duration)
  durationRef.current = duration // Update ref synchronously on every render

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Timer effect for updating duration during recording
  useEffect(() => {
    // Only start timer when actively recording
    if (recordingState === RecordingState.RECORDING && startTime && !timerRef.current) {
      const updateTimer = () => {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime + pausedDuration

        if (elapsed >= maxDurationMs) {
          // Hit maximum duration - automatically stop
          setDuration(maxDurationMs)
          setRecordingState(RecordingState.STOPPED)
          onMaxDurationReached?.()
          onStateChange?.(RecordingState.STOPPED, maxDurationMs)
          // Clear timer
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return
        }

        setDuration(elapsed)
      }

      // Set up interval for continuous updates
      timerRef.current = setInterval(updateTimer, 100) // Update every 100ms
    }

    // Clear timer when not recording or when explicitly paused/stopped
    if (recordingState !== RecordingState.RECORDING && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [recordingState, startTime, maxDurationMs, onMaxDurationReached, onStateChange])

  // Start recording
  const startRecording = useCallback(async () => {
    if (recordingState !== RecordingState.IDLE) {
      onError?.('Cannot start recording: not in idle state')
      return
    }

    if (!cameraControls?.isReady) {
      const errorMsg = "Camera is not ready yet. Wait for 'onCameraReady' callback"
      onError?.(errorMsg)
      return
    }

    try {
      const now = Date.now()
      setStartTime(now)
      setDuration(0)
      setPausedDuration(0)
      setRecordingState(RecordingState.RECORDING)

      // Start camera recording
      await cameraControls.startRecording()

      onStateChange?.(RecordingState.RECORDING, 0)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to start recording')
    }
  }, [recordingState, cameraControls, onStateChange, onError])

  // Pause recording
  const pauseRecording = useCallback(async () => {
    if (recordingState !== RecordingState.RECORDING) {
      onError?.('Cannot pause: not currently recording')
      return
    }

    try {
      // Pause camera recording
      await cameraControls?.pauseRecording()

      // Calculate final duration from startTime (more accurate than reading duration state)
      let finalDuration = durationRef.current
      if (startTime) {
        const currentTime = Date.now()
        finalDuration = currentTime - startTime + pausedDuration
        setPausedDuration(finalDuration)
        setDuration(finalDuration)
      }

      // Clear timer BEFORE changing state to prevent race conditions
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setRecordingState(RecordingState.PAUSED)
      onStateChange?.(RecordingState.PAUSED, finalDuration)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to pause recording')
    }
  }, [recordingState, cameraControls, startTime, pausedDuration, onStateChange, onError])

  // Resume recording
  // Stop recording
  const stopRecording = useCallback(async () => {
    if (recordingState === RecordingState.IDLE || recordingState === RecordingState.STOPPED) {
      onError?.('Cannot stop: recording not active')
      return
    }

    try {
      // Stop camera recording
      await cameraControls?.stopRecording()

      // Finalize duration if we were actively recording
      // Use ref to read current duration without dependency
      let finalDuration = durationRef.current
      if (recordingState === RecordingState.RECORDING && startTime) {
        const currentTime = Date.now()
        finalDuration = Math.min(currentTime - startTime + pausedDuration, maxDurationMs)
        setDuration(finalDuration)
      }

      setRecordingState(RecordingState.STOPPED)
      log.info('useRecordingStateMachine', 'Calling onStateChange with STOPPED', {
        duration: finalDuration,
      })
      onStateChange?.(RecordingState.STOPPED, finalDuration)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to stop recording')
    }
  }, [
    recordingState,
    cameraControls,
    startTime,
    pausedDuration,
    maxDurationMs,
    onStateChange,
    onError,
  ])

  const resumeRecording = useCallback(async () => {
    if (recordingState !== RecordingState.PAUSED) {
      onError?.('Cannot resume: not currently paused')
      return
    }

    // Check if we would exceed max duration (use ref to read current value)
    if (durationRef.current >= maxDurationMs) {
      showAlert(
        'Maximum Duration Reached',
        'This recording has reached the 60-second limit and cannot be resumed.'
      )
      return
    }

    try {
      // Resume camera recording
      await cameraControls?.resumeRecording()

      const now = Date.now()
      setStartTime(now)
      // Keep pausedDuration as is - it will be used in timer calculations
      setRecordingState(RecordingState.RECORDING)

      // Use ref to read current duration without dependency
      onStateChange?.(RecordingState.RECORDING, durationRef.current)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume recording'

      // Check if VisionCamera reports no active recording (pause may have stopped it)
      if (
        errorMessage.includes('no active video recording') ||
        errorMessage.includes('stopRecording() twice')
      ) {
        log.error('useRecordingStateMachine', 'Resume failed: recording was stopped during pause', {
          error: errorMessage,
          recordingState,
          duration: durationRef.current,
        })

        // Reset to idle state since the recording session was lost
        setRecordingState(RecordingState.IDLE)
        setDuration(0)
        setStartTime(null)
        setPausedDuration(0)

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        onStateChange?.(RecordingState.IDLE, 0)
        onError?.('Recording session was lost. Please start a new recording.')
        return
      }

      onError?.(errorMessage)
    }
  }, [recordingState, cameraControls, maxDurationMs, onStateChange, onError])

  // Reset to idle state
  const resetRecording = useCallback(() => {
    try {
      setRecordingState(RecordingState.IDLE)
      setDuration(0)
      setStartTime(null)
      setPausedDuration(0)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Reset zoom to level 1 when switching to idle state
      onResetZoom?.()

      onStateChange?.(RecordingState.IDLE, 0)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to reset recording')
    }
  }, [onStateChange, onError, onResetZoom])

  // Helper function to format duration as MM:SS
  const formatDuration = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Computed values
  const isAtMaxDuration = duration >= maxDurationMs
  const remainingTime = Math.max(0, maxDurationMs - duration)

  const formattedDuration = formatDuration(duration)

  const canRecord = recordingState === RecordingState.IDLE
  const canPause = recordingState === RecordingState.RECORDING
  const canResume = recordingState === RecordingState.PAUSED && duration < maxDurationMs
  const canStop =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED

  return {
    // State
    recordingState,
    duration,
    isAtMaxDuration,

    // Actions
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,

    // Computed
    remainingTime,
    formattedDuration,
    canRecord,
    canPause,
    canResume,
    canStop,
  }
}

// Validation helper
export function validateRecordingTransition(
  from: RecordingState,
  to: RecordingState
): { valid: boolean; reason?: string } {
  const validTransitions: Record<RecordingState, RecordingState[]> = {
    [RecordingState.IDLE]: [RecordingState.RECORDING],
    [RecordingState.RECORDING]: [RecordingState.PAUSED, RecordingState.STOPPED],
    [RecordingState.PAUSED]: [RecordingState.RECORDING, RecordingState.STOPPED],
    [RecordingState.STOPPED]: [RecordingState.IDLE],
  }

  const allowedStates = validTransitions[from]
  const valid = allowedStates.includes(to)

  return {
    valid,
    reason: valid ? undefined : `Invalid transition from ${from} to ${to}`,
  }
}
