import type { UploadProgress, UploadStatus } from '@api/src/validation/cameraRecordingSchemas'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface UploadTask {
  id: string
  videoRecordingId: number | null
  filename: string
  fileSize: number
  bytesUploaded: number
  progress: number
  status: UploadStatus
  error: string | null
  startTime: number
  endTime: number | null
  retryCount: number
  maxRetries: number
}

export interface UploadQueue {
  pending: UploadTask[]
  active: UploadTask[]
  completed: UploadTask[]
  failed: UploadTask[]
}

export interface UploadProgressStore {
  // Upload queue
  queue: UploadQueue

  // Active uploads tracking
  activeUploads: Map<string, UploadTask>
  maxConcurrentUploads: number

  // Global state
  isUploading: boolean
  totalBytesToUpload: number
  totalBytesUploaded: number
  globalProgress: number

  // Network state
  isOnline: boolean
  networkSpeed: number | null // bytes per second

  // Actions
  addUploadTask: (
    task: Omit<
      UploadTask,
      'id' | 'progress' | 'bytesUploaded' | 'startTime' | 'endTime' | 'retryCount'
    >
  ) => string
  updateUploadProgress: (taskId: string, progress: Partial<UploadProgress>) => void
  setUploadStatus: (taskId: string, status: UploadStatus, error?: string) => void
  retryUpload: (taskId: string) => void
  cancelUpload: (taskId: string) => void
  removeUpload: (taskId: string) => void

  // Queue management
  processQueue: () => void
  pauseQueue: () => void
  resumeQueue: () => void
  clearCompleted: () => void
  clearFailed: () => void
  clearAll: () => void

  // Network actions
  setOnlineStatus: (online: boolean) => void
  setNetworkSpeed: (speed: number | null) => void

  // Getters
  getUploadTask: (taskId: string) => UploadTask | null
  getUploadsByStatus: (status: UploadStatus) => UploadTask[]
  getTotalProgress: () => number
  getEstimatedTimeRemaining: () => number | null
}

const createEmptyQueue = (): UploadQueue => ({
  pending: [],
  active: [],
  completed: [],
  failed: [],
})

export const useUploadProgressStore = create<UploadProgressStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      queue: createEmptyQueue(),
      activeUploads: new Map(),
      maxConcurrentUploads: 3,
      isUploading: false,
      totalBytesToUpload: 0,
      totalBytesUploaded: 0,
      globalProgress: 0,
      isOnline: true,
      networkSpeed: null,

      // Add upload task
      addUploadTask: (taskData) => {
        const taskId = crypto.randomUUID()
        const task: UploadTask = {
          ...taskData,
          id: taskId,
          progress: 0,
          bytesUploaded: 0,
          startTime: Date.now(),
          endTime: null,
          retryCount: 0,
          maxRetries: taskData.maxRetries || 3,
        }

        set((draft) => {
          draft.queue.pending.push(task)
          draft.totalBytesToUpload += task.fileSize
        })

        // Auto-process queue
        get().processQueue()

        return taskId
      },

      // Update upload progress
      updateUploadProgress: (taskId, progressUpdate) =>
        set((draft) => {
          const task = draft.activeUploads.get(taskId)
          if (!task) return

          // Update task progress
          if (progressUpdate.bytesUploaded !== undefined) {
            const oldBytes = task.bytesUploaded
            task.bytesUploaded = progressUpdate.bytesUploaded
            task.progress = Math.round((task.bytesUploaded / task.fileSize) * 100)

            // Update global progress
            draft.totalBytesUploaded += task.bytesUploaded - oldBytes
          }

          if (progressUpdate.percentage !== undefined) {
            task.progress = progressUpdate.percentage
            task.bytesUploaded = Math.round((task.progress / 100) * task.fileSize)
          }

          // Update global progress
          draft.globalProgress =
            draft.totalBytesToUpload > 0
              ? Math.round((draft.totalBytesUploaded / draft.totalBytesToUpload) * 100)
              : 0

          // Update network speed estimation
          if (task.startTime && task.bytesUploaded > 0) {
            const elapsed = (Date.now() - task.startTime) / 1000
            draft.networkSpeed = task.bytesUploaded / elapsed
          }
        }),

      // Set upload status
      setUploadStatus: (taskId, status, error) =>
        set((draft) => {
          const task = draft.activeUploads.get(taskId)
          if (!task) return

          task.status = status
          task.error = error || null

          if (status === 'completed') {
            task.endTime = Date.now()
            task.progress = 100
            task.bytesUploaded = task.fileSize

            // Move to completed queue
            draft.queue.completed.push(task)
            draft.queue.active = draft.queue.active.filter((t: UploadTask) => t.id !== taskId)
            draft.activeUploads.delete(taskId)
          } else if (status === 'failed') {
            task.endTime = Date.now()

            // Move to failed queue or retry
            if (task.retryCount < task.maxRetries) {
              task.retryCount++
              task.status = 'pending'
              task.error = null
              draft.queue.pending.unshift(task) // Add to front of queue
            } else {
              draft.queue.failed.push(task)
            }

            draft.queue.active = draft.queue.active.filter((t: UploadTask) => t.id !== taskId)
            draft.activeUploads.delete(taskId)
          }

          // Update uploading state
          draft.isUploading = draft.activeUploads.size > 0 || draft.queue.pending.length > 0
        }),

      // Retry upload
      retryUpload: (taskId) =>
        set((draft) => {
          const failedIndex = draft.queue.failed.findIndex((t: UploadTask) => t.id === taskId)
          if (failedIndex === -1) return

          const task = draft.queue.failed[failedIndex]
          task.status = 'pending'
          task.error = null
          task.retryCount = 0
          task.bytesUploaded = 0
          task.progress = 0
          task.startTime = Date.now()
          task.endTime = null

          // Move back to pending queue
          draft.queue.failed.splice(failedIndex, 1)
          draft.queue.pending.push(task)
        }),

      // Cancel upload
      cancelUpload: (taskId) =>
        set((draft) => {
          const task = draft.activeUploads.get(taskId)
          if (task) {
            task.status = 'failed'
            task.error = 'Cancelled by user'
            task.endTime = Date.now()

            draft.queue.failed.push(task)
            draft.queue.active = draft.queue.active.filter((t: UploadTask) => t.id !== taskId)
            draft.activeUploads.delete(taskId)
          }

          // Also remove from pending queue
          draft.queue.pending = draft.queue.pending.filter((t: UploadTask) => t.id !== taskId)

          draft.isUploading = draft.activeUploads.size > 0 || draft.queue.pending.length > 0
        }),

      // Remove upload
      removeUpload: (taskId) =>
        set((draft) => {
          // Remove from all queues
          draft.queue.pending = draft.queue.pending.filter((t: UploadTask) => t.id !== taskId)
          draft.queue.active = draft.queue.active.filter((t: UploadTask) => t.id !== taskId)
          draft.queue.completed = draft.queue.completed.filter((t: UploadTask) => t.id !== taskId)
          draft.queue.failed = draft.queue.failed.filter((t: UploadTask) => t.id !== taskId)
          draft.activeUploads.delete(taskId)
        }),

      // Process queue
      processQueue: () => {
        const state = get()
        if (!state.isOnline || state.activeUploads.size >= state.maxConcurrentUploads) {
          return
        }

        set((draft) => {
          const availableSlots = draft.maxConcurrentUploads - draft.activeUploads.size
          const tasksToStart = draft.queue.pending.splice(0, availableSlots)

          tasksToStart.forEach((task: UploadTask) => {
            task.status = 'uploading'
            task.startTime = Date.now()
            draft.queue.active.push(task)
            draft.activeUploads.set(task.id, task)
          })

          draft.isUploading = draft.activeUploads.size > 0 || draft.queue.pending.length > 0
        })
      },

      // Pause queue
      pauseQueue: () =>
        set((draft) => {
          draft.isUploading = false
        }),

      // Resume queue
      resumeQueue: () => {
        set((draft) => {
          draft.isUploading = true
        })
        get().processQueue()
      },

      // Clear completed uploads
      clearCompleted: () =>
        set((draft) => {
          draft.queue.completed = []
        }),

      // Clear failed uploads
      clearFailed: () =>
        set((draft) => {
          draft.queue.failed = []
        }),

      // Clear all uploads
      clearAll: () =>
        set((draft) => {
          draft.queue = createEmptyQueue()
          draft.activeUploads.clear()
          draft.isUploading = false
          draft.totalBytesToUpload = 0
          draft.totalBytesUploaded = 0
          draft.globalProgress = 0
        }),

      // Set online status
      setOnlineStatus: (online) =>
        set((draft) => {
          draft.isOnline = online
          if (online) {
            // Resume processing when back online
            get().processQueue()
          }
        }),

      // Set network speed
      setNetworkSpeed: (speed) =>
        set((draft) => {
          draft.networkSpeed = speed
        }),

      // Get upload task
      getUploadTask: (taskId) => {
        const state = get()
        return (
          state.activeUploads.get(taskId) ||
          state.queue.pending.find((t) => t.id === taskId) ||
          state.queue.completed.find((t) => t.id === taskId) ||
          state.queue.failed.find((t) => t.id === taskId) ||
          null
        )
      },

      // Get uploads by status
      getUploadsByStatus: (status) => {
        const state = get()
        switch (status) {
          case 'pending':
            return state.queue.pending
          case 'uploading':
            return state.queue.active
          case 'completed':
            return state.queue.completed
          case 'failed':
            return state.queue.failed
          default:
            return []
        }
      },

      // Get total progress
      getTotalProgress: () => {
        const state = get()
        return state.globalProgress
      },

      // Get estimated time remaining
      getEstimatedTimeRemaining: () => {
        const state = get()
        if (!state.networkSpeed || state.totalBytesToUpload === 0) {
          return null
        }

        const remainingBytes = state.totalBytesToUpload - state.totalBytesUploaded
        return Math.ceil(remainingBytes / state.networkSpeed)
      },
    }))
  )
)

// Selectors for common state combinations
export const useUploadProgressSelectors = () => {
  const store = useUploadProgressStore()

  return {
    // Queue status
    hasActiveUploads: store.activeUploads.size > 0,
    hasPendingUploads: store.queue.pending.length > 0,
    hasFailedUploads: store.queue.failed.length > 0,
    hasCompletedUploads: store.queue.completed.length > 0,

    // Counts
    activeCount: store.activeUploads.size,
    pendingCount: store.queue.pending.length,
    completedCount: store.queue.completed.length,
    failedCount: store.queue.failed.length,
    totalCount:
      store.queue.pending.length +
      store.activeUploads.size +
      store.queue.completed.length +
      store.queue.failed.length,

    // Progress
    overallProgress: store.globalProgress,
    isUploading: store.isUploading,
    canUpload: store.isOnline && store.activeUploads.size < store.maxConcurrentUploads,

    // Network
    isOnline: store.isOnline,
    networkSpeed: store.networkSpeed,
    estimatedTimeRemaining: store.getEstimatedTimeRemaining(),
  }
}

// Hook for monitoring specific upload
export const useUploadTask = (taskId: string) => {
  const getUploadTask = useUploadProgressStore((state) => state.getUploadTask)
  const task = getUploadTask(taskId)

  return {
    task,
    isActive: task?.status === 'uploading',
    isCompleted: task?.status === 'completed',
    isFailed: task?.status === 'failed',
    isPending: task?.status === 'pending',
    progress: task?.progress || 0,
    error: task?.error,
  }
}
