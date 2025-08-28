import { useCallback, useEffect, useRef, useState } from 'react'
import { RecordingState } from '../types'
import { Alert } from 'react-native'

interface RecordingStateMachineConfig {
  maxDurationMs: number
  onMaxDurationReached?: () => void
  onStateChange?: (state: RecordingState, duration: number) => void
  onError?: (error: string) => void
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
  const { maxDurationMs, onMaxDurationReached, onStateChange, onError } = config

  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pausedDuration, setPausedDuration] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const requestRef = useRef<number | null>(null)

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  // High precision timer using requestAnimationFrame
  const updateDuration = useCallback(() => {
    if (recordingState === RecordingState.RECORDING && startTime) {
      const currentTime = Date.now()
      const elapsed = currentTime - startTime + pausedDuration

      if (elapsed >= maxDurationMs) {
        // Hit maximum duration - automatically stop
        setDuration(maxDurationMs)
        setRecordingState(RecordingState.STOPPED)
        onMaxDurationReached?.()
        onStateChange?.(RecordingState.STOPPED, maxDurationMs)
        return
      }

      setDuration(elapsed)
      requestRef.current = requestAnimationFrame(updateDuration)
    }
  }, [
    recordingState,
    startTime,
    pausedDuration,
    maxDurationMs,
    onMaxDurationReached,
    onStateChange,
  ])

  // Start recording
  const startRecording = useCallback(() => {
    if (recordingState !== RecordingState.IDLE) {
      onError?.('Cannot start recording: not in idle state')
      return
    }

    try {
      const now = Date.now()
      setStartTime(now)
      setDuration(0)
      setPausedDuration(0)
      setRecordingState(RecordingState.RECORDING)

      onStateChange?.(RecordingState.RECORDING, 0)
      requestRef.current = requestAnimationFrame(updateDuration)
    } catch (error) {
      console.error('Failed to start recording:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to start recording')
    }
  }, [recordingState, onStateChange, onError, updateDuration])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (recordingState !== RecordingState.RECORDING) {
      onError?.('Cannot pause: not currently recording')
      return
    }

    try {
      if (startTime) {
        const currentTime = Date.now()
        const elapsed = currentTime - startTime + pausedDuration
        setPausedDuration(elapsed)
        setDuration(elapsed)
      }

      setRecordingState(RecordingState.PAUSED)
      onStateChange?.(RecordingState.PAUSED, duration)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
    } catch (error) {
      console.error('Failed to pause recording:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to pause recording')
    }
  }, [recordingState, startTime, pausedDuration, duration, onStateChange, onError])

  // Resume recording
  // Stop recording
  const stopRecording = useCallback(() => {
    if (recordingState === RecordingState.IDLE || recordingState === RecordingState.STOPPED) {
      onError?.('Cannot stop: recording not active')
      return
    }

    try {
      // Finalize duration if we were actively recording
      if (recordingState === RecordingState.RECORDING && startTime) {
        const currentTime = Date.now()
        const finalDuration = Math.min(currentTime - startTime + pausedDuration, maxDurationMs)
        setDuration(finalDuration)
      }

      setRecordingState(RecordingState.STOPPED)
      onStateChange?.(RecordingState.STOPPED, duration)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to stop recording')
    }
  }, [recordingState, startTime, pausedDuration, duration, maxDurationMs, onStateChange, onError])

  const resumeRecording = useCallback(() => {
    if (recordingState !== RecordingState.PAUSED) {
      onError?.('Cannot resume: not currently paused')
      return
    }

    // Check if we would exceed max duration
    if (duration >= maxDurationMs) {
      Alert.alert(
        'Maximum Duration Reached',
        'This recording has reached the 60-second limit and cannot be resumed.',
        [{ text: 'OK' }]
      )
      return
    }

    try {
      const now = Date.now()
      setStartTime(now)
      setRecordingState(RecordingState.RECORDING)

      onStateChange?.(RecordingState.RECORDING, duration)
      requestRef.current = requestAnimationFrame(updateDuration)
    } catch (error) {
      console.error('Failed to resume recording:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to resume recording')
    }
  }, [recordingState, duration, maxDurationMs, onStateChange, onError, updateDuration])

  // Reset to idle state
  const resetRecording = useCallback(() => {
    try {
      setRecordingState(RecordingState.IDLE)
      setDuration(0)
      setStartTime(null)
      setPausedDuration(0)

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
        requestRef.current = null
      }

      onStateChange?.(RecordingState.IDLE, 0)
    } catch (error) {
      console.error('Failed to reset recording:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to reset recording')
    }
  }, [onStateChange, onError])

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
