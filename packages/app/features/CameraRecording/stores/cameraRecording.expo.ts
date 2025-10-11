import type {
  CameraRecordingState,
  CameraType,
  PermissionStatus,
  RecordingSession,
  ZoomLevel,
} from '@api/src/validation/cameraRecordingSchemas'
import React from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// React Native compatible UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for React Native environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface CameraPermissions {
  camera: PermissionStatus
  microphone: PermissionStatus
}

export interface CameraSettings {
  cameraType: CameraType
  zoomLevel: ZoomLevel
  flashEnabled: boolean
  gridEnabled: boolean
  qualityPreset: 'low' | 'medium' | 'high'
}

export interface RecordingMetrics {
  startTime: number | null
  duration: number
  frameRate: number
  resolution: { width: number; height: number } | null
  fileSize: number
}

export interface CameraRecordingStore {
  // Recording state
  recordingState: CameraRecordingState
  currentSession: RecordingSession | null

  // Camera settings
  settings: CameraSettings
  permissions: CameraPermissions

  // Recording metrics
  metrics: RecordingMetrics

  // UI state
  isInitializing: boolean
  isSettingsModalOpen: boolean
  showPermissionModal: boolean
  error: string | null

  // Actions
  setRecordingState: (state: CameraRecordingState) => void
  startRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void

  // Camera controls
  setCameraType: (type: CameraType) => void
  setZoomLevel: (level: ZoomLevel) => void
  toggleFlash: () => void
  toggleGrid: () => void
  setQualityPreset: (preset: CameraSettings['qualityPreset']) => void

  // Permissions
  setPermissions: (permissions: Partial<CameraPermissions>) => void
  requestPermissions: () => Promise<boolean>

  // Session management
  createSession: () => RecordingSession
  updateSession: (updates: Partial<RecordingSession>) => void
  clearSession: () => void

  // UI actions
  setInitializing: (initializing: boolean) => void
  setSettingsModalOpen: (open: boolean) => void
  setPermissionModalOpen: (open: boolean) => void
  setError: (error: string | null) => void

  // Metrics
  updateMetrics: (updates: Partial<RecordingMetrics>) => void
  resetMetrics: () => void

  // Cleanup
  reset: () => void
}

const initialSettings: CameraSettings = {
  cameraType: 'back',
  zoomLevel: 1,
  flashEnabled: false,
  gridEnabled: false,
  qualityPreset: 'high',
}

const initialPermissions: CameraPermissions = {
  camera: 'undetermined',
  microphone: 'undetermined',
}

const initialMetrics: RecordingMetrics = {
  startTime: null,
  duration: 0,
  frameRate: 30,
  resolution: null,
  fileSize: 0,
}

export const useCameraRecordingStore = create<CameraRecordingStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      recordingState: 'idle',
      currentSession: null,
      settings: initialSettings,
      permissions: initialPermissions,
      metrics: initialMetrics,
      isInitializing: false,
      isSettingsModalOpen: false,
      showPermissionModal: false,
      error: null,

      // Recording state actions
      setRecordingState: (state) =>
        set((draft) => {
          draft.recordingState = state
        }),

      startRecording: () =>
        set((draft) => {
          const now = Date.now()
          draft.recordingState = 'recording'
          draft.metrics.startTime = now
          draft.metrics.duration = 0
          draft.error = null

          // Create or update session
          if (!draft.currentSession) {
            draft.currentSession = {
              id: generateUUID(),
              state: 'recording',
              startTime: now,
              duration: 0,
              cameraType: draft.settings.cameraType,
              zoomLevel: draft.settings.zoomLevel,
              isRecording: true,
              isPaused: false,
            }
          } else {
            draft.currentSession.state = 'recording'
            draft.currentSession.isRecording = true
            draft.currentSession.isPaused = false
            if (!draft.currentSession.startTime) {
              draft.currentSession.startTime = now
            }
          }
        }),

      pauseRecording: () =>
        set((draft) => {
          draft.recordingState = 'paused'
          if (draft.currentSession) {
            draft.currentSession.state = 'paused'
            draft.currentSession.isRecording = false
            draft.currentSession.isPaused = true
          }
        }),

      resumeRecording: () =>
        set((draft) => {
          draft.recordingState = 'recording'
          if (draft.currentSession) {
            draft.currentSession.state = 'recording'
            draft.currentSession.isRecording = true
            draft.currentSession.isPaused = false
          }
        }),

      stopRecording: () =>
        set((draft) => {
          draft.recordingState = 'stopped'
          if (draft.currentSession) {
            draft.currentSession.state = 'stopped'
            draft.currentSession.isRecording = false
            draft.currentSession.isPaused = false
          }
        }),

      // Camera control actions
      setCameraType: (type) =>
        set((draft) => {
          draft.settings.cameraType = type
          if (draft.currentSession) {
            draft.currentSession.cameraType = type
          }
        }),

      setZoomLevel: (level) =>
        set((draft) => {
          draft.settings.zoomLevel = level
          if (draft.currentSession) {
            draft.currentSession.zoomLevel = level
          }
        }),

      toggleFlash: () =>
        set((draft) => {
          draft.settings.flashEnabled = !draft.settings.flashEnabled
        }),

      toggleGrid: () =>
        set((draft) => {
          draft.settings.gridEnabled = !draft.settings.gridEnabled
        }),

      setQualityPreset: (preset) =>
        set((draft) => {
          draft.settings.qualityPreset = preset
        }),

      // Permission actions
      setPermissions: (permissions) =>
        set((draft) => {
          Object.assign(draft.permissions, permissions)
        }),

      requestPermissions: async () => {
        // Mock permission request - replace with actual implementation
        try {
          set((draft) => {
            draft.isInitializing = true
          })

          // Simulate permission request
          await new Promise((resolve) => setTimeout(resolve, 1000))

          set((draft) => {
            draft.permissions.camera = 'granted'
            draft.permissions.microphone = 'granted'
            draft.isInitializing = false
            draft.showPermissionModal = false
          })

          return true
        } catch (_error) {
          set((draft) => {
            draft.permissions.camera = 'denied'
            draft.permissions.microphone = 'denied'
            draft.isInitializing = false
            draft.error = 'Permission request failed'
          })

          return false
        }
      },

      // Session management
      createSession: () => {
        const session: RecordingSession = {
          id: generateUUID(),
          state: 'idle',
          startTime: null,
          duration: 0,
          cameraType: get().settings.cameraType,
          zoomLevel: get().settings.zoomLevel,
          isRecording: false,
          isPaused: false,
        }

        set((draft) => {
          draft.currentSession = session
        })

        return session
      },

      updateSession: (updates) =>
        set((draft) => {
          if (draft.currentSession) {
            Object.assign(draft.currentSession, updates)
          }
        }),

      clearSession: () =>
        set((draft) => {
          draft.currentSession = null
          draft.recordingState = 'idle'
        }),

      // UI actions
      setInitializing: (initializing) =>
        set((draft) => {
          draft.isInitializing = initializing
        }),

      setSettingsModalOpen: (open) =>
        set((draft) => {
          draft.isSettingsModalOpen = open
        }),

      setPermissionModalOpen: (open) =>
        set((draft) => {
          draft.showPermissionModal = open
        }),

      setError: (error) =>
        set((draft) => {
          draft.error = error
        }),

      // Metrics actions
      updateMetrics: (updates) =>
        set((draft) => {
          Object.assign(draft.metrics, updates)

          // Update session duration if recording
          if (draft.currentSession && draft.metrics.startTime) {
            draft.currentSession.duration = draft.metrics.duration
          }
        }),

      resetMetrics: () =>
        set((draft) => {
          draft.metrics = { ...initialMetrics }
        }),

      // Cleanup
      reset: () =>
        set((draft) => {
          draft.recordingState = 'idle'
          draft.currentSession = null
          draft.settings = { ...initialSettings }
          draft.permissions = { ...initialPermissions }
          draft.metrics = { ...initialMetrics }
          draft.isInitializing = false
          draft.isSettingsModalOpen = false
          draft.showPermissionModal = false
          draft.error = null
        }),
    }))
  )
)

// Selectors for common state combinations
export const useCameraRecordingSelectors = () => {
  const store = useCameraRecordingStore()

  return {
    // Recording state selectors
    isRecording: store.recordingState === 'recording',
    isPaused: store.recordingState === 'paused',
    isStopped: store.recordingState === 'stopped',
    isIdle: store.recordingState === 'idle',

    // Permission selectors
    hasAllPermissions:
      store.permissions.camera === 'granted' && store.permissions.microphone === 'granted',
    hasCameraPermission: store.permissions.camera === 'granted',
    hasMicrophonePermission: store.permissions.microphone === 'granted',
    needsPermissions:
      store.permissions.camera !== 'granted' || store.permissions.microphone !== 'granted',

    // UI state selectors
    canRecord:
      store.permissions.camera === 'granted' &&
      store.permissions.microphone === 'granted' &&
      !store.isInitializing,
    canSwapCamera: store.recordingState !== 'recording',
    canChangeZoom: true,
    showError: !!store.error,

    // Session selectors
    hasActiveSession: !!store.currentSession,
    sessionDuration: store.currentSession?.duration || 0,
    isSessionRecording: store.currentSession?.isRecording || false,
  }
}

// Timer hook for recording duration
export const useRecordingTimer = () => {
  const { metrics, updateMetrics } = useCameraRecordingStore()
  const { isRecording } = useCameraRecordingSelectors()

  // Update duration every second when recording
  React.useEffect(() => {
    if (!isRecording || !metrics.startTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      const duration = Math.floor((now - metrics.startTime!) / 1000)

      // Stop at 60 seconds
      if (duration >= 60) {
        useCameraRecordingStore.getState().stopRecording()
        return
      }

      updateMetrics({ duration })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, metrics.startTime, updateMetrics])

  return {
    duration: metrics.duration,
    formattedDuration: formatDuration(metrics.duration),
    remainingTime: Math.max(0, 60 - metrics.duration),
  }
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
