import { useUploadProgressStore } from '@app/stores/uploadProgress'
import { log } from '@my/logging'
import React from 'react'
import { createAnalysisJob } from './analysisService'
import { createOptimisticAnalysisJob, rollbackOptimisticUpdate } from './optimisticUpdatesService'
import { deleteVideoRecording, uploadVideo } from './videoUploadService'
import type { VideoUploadOptions } from './videoUploadService'

export interface OfflineQueueItem {
  id: string
  type: 'video_upload' | 'analysis_job' | 'video_delete'
  data: any
  retryCount: number
  maxRetries: number
  createdAt: number
  lastAttempt: number | null
  error: string | null
}

export interface OfflineQueue {
  items: OfflineQueueItem[]
  isProcessing: boolean
  lastSync: number | null
}

// Module constants
const STORAGE_KEY = 'offline_queue'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // Start with 1 second
const MAX_RETRY_DELAY = 30000 // Max 30 seconds

// Module state
let isProcessing = false
let retryTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Check if online
 */
export function isOnlineStatus(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Initialize offline service
 */
export function initialize(): void {
  // Listen for online/offline events
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Process queue on initialization if online
  if (isOnlineStatus()) {
    processQueue()
  }

  // Update upload store with online status
  useUploadProgressStore.getState().setOnlineStatus(isOnlineStatus())
}

/**
 * Handle coming back online
 */
function handleOnline(): void {
  log.info('OfflineService', '📶 Back online - processing offline queue')
  useUploadProgressStore.getState().setOnlineStatus(true)
  processQueue()
}

/**
 * Handle going offline
 */
function handleOffline(): void {
  log.info('OfflineService', '📵 Gone offline - queuing operations')
  useUploadProgressStore.getState().setOnlineStatus(false)
}

/**
 * Add item to offline queue
 */
export function addToQueue(
  type: OfflineQueueItem['type'],
  data: any,
  maxRetries = MAX_RETRIES
): string {
  const item: OfflineQueueItem = {
    id: crypto.randomUUID(),
    type,
    data,
    retryCount: 0,
    maxRetries,
    createdAt: Date.now(),
    lastAttempt: null,
    error: null,
  }

  const queue = getQueue()
  queue.items.push(item)
  saveQueue(queue)

  // Process immediately if online
  if (isOnlineStatus()) {
    processQueue()
  }

  return item.id
}

/**
 * Queue video upload for offline processing
 */
export async function queueVideoUpload(options: VideoUploadOptions): Promise<string> {
  // Create optimistic upload task
  const uploadStore = useUploadProgressStore.getState()
  const taskId = uploadStore.addUploadTask({
    filename: options.originalFilename || `video_${Date.now()}.${options.format}`,
    fileSize: options.file.size,
    status: 'pending',
    error: null,
    maxRetries: MAX_RETRIES,
    videoRecordingId: null, // Will be set when upload completes and video recording is created
  })

  // Add to offline queue
  const queueId = addToQueue('video_upload', {
    ...options,
    taskId,
    // Convert File/Blob to base64 for storage
    fileData: await fileToBase64(options.file),
  })

  return queueId
}

/**
 * Queue analysis job creation
 */
export function queueAnalysisJob(videoRecordingId: number): string {
  // Create optimistic analysis job
  const optimisticId = createOptimisticAnalysisJob({
    user_id: '', // Will be filled when processing
    video_recording_id: videoRecordingId,
  })

  // Add to offline queue
  const queueId = addToQueue('analysis_job', {
    videoRecordingId,
    optimisticId,
  })

  return queueId
}

/**
 * Queue video deletion
 */
export function queueVideoDelete(recordingId: number): string {
  return addToQueue('video_delete', { recordingId })
}

/**
 * Process offline queue
 */
export async function processQueue(): Promise<void> {
  if (isProcessing || !isOnlineStatus()) {
    return
  }

  isProcessing = true
  const queue = getQueue()

  log.info('OfflineService', `🔄 Processing ${queue.items.length} offline queue items`)

  for (const item of queue.items) {
    try {
      await processQueueItem(item)

      // Remove successful item from queue
      queue.items = queue.items.filter((i: OfflineQueueItem) => i.id !== item.id)

      // Clear any retry timeout
      const timeout = retryTimeouts.get(item.id)
      if (timeout) {
        clearTimeout(timeout)
        retryTimeouts.delete(item.id)
      }
    } catch (error) {
      item.retryCount++
      item.lastAttempt = Date.now()
      item.error = error instanceof Error ? error.message : 'Unknown error'

      if (item.retryCount >= item.maxRetries) {
        // Move to failed state but keep in queue for manual retry
        handleItemFailure(item)
      } else {
        // Schedule retry with exponential backoff
        scheduleRetry(item)
      }
    }
  }

  queue.lastSync = Date.now()
  saveQueue(queue)
  isProcessing = false
}

/**
 * Process individual queue item
 */
async function processQueueItem(item: OfflineQueueItem): Promise<void> {
  switch (item.type) {
    case 'video_upload':
      await processVideoUpload(item)
      break

    case 'analysis_job':
      await processAnalysisJob(item)
      break

    case 'video_delete':
      await processVideoDelete(item)
      break

    default:
      throw new Error(`Unknown queue item type: ${item.type}`)
  }
}

/**
 * Process video upload from queue
 */
export async function processVideoUpload(item: OfflineQueueItem): Promise<void> {
  const { fileData, taskId, ...uploadOptions } = item.data

  // Convert base64 back to File
  const file = base64ToFile(fileData, uploadOptions.originalFilename)

  // Update upload task status
  const uploadStore = useUploadProgressStore.getState()
  uploadStore.setUploadStatus(taskId, 'uploading')

  // Perform actual upload
  const result = await uploadVideo({
    ...uploadOptions,
    file,
    onProgress: (progress) => {
      uploadStore.updateUploadProgress(taskId, {
        bytesUploaded: Math.round((progress / 100) * file.size),
        totalBytes: file.size,
        percentage: progress,
        status: 'uploading',
      })
    },
  })

  // Update task with success
  uploadStore.setUploadStatus(taskId, 'completed')

  log.info('OfflineService', `✅ Successfully uploaded video: ${result.filename}`)
}

/**
 * Process analysis job creation from queue
 */
export async function processAnalysisJob(item: OfflineQueueItem): Promise<void> {
  const { videoRecordingId } = item.data

  // Create actual analysis job
  const job = await createAnalysisJob(videoRecordingId)

  // Confirm optimistic update
  // Note: handleMutationSuccess function needs to be added to optimisticUpdatesService
  // OptimisticUpdatesService.handleMutationSuccess(optimisticId, job);

  log.info('OfflineService', `✅ Successfully created analysis job: ${job.id}`)
}

/**
 * Process video deletion from queue
 */
export async function processVideoDelete(item: OfflineQueueItem): Promise<void> {
  const { recordingId } = item.data

  await deleteVideoRecording(recordingId)

  log.info('OfflineService', `✅ Successfully deleted video recording: ${recordingId}`)
}

/**
 * Handle item failure after max retries
 */
function handleItemFailure(item: OfflineQueueItem): void {
  switch (item.type) {
    case 'video_upload': {
      const uploadStore = useUploadProgressStore.getState()
      uploadStore.setUploadStatus(item.data.taskId, 'failed', item.error || 'Max retries exceeded')
      break
    }

    case 'analysis_job':
      rollbackOptimisticUpdate(item.data.optimisticId)
      break
  }
}

/**
 * Schedule retry with exponential backoff
 */
function scheduleRetry(item: OfflineQueueItem): void {
  const delay = Math.min(RETRY_DELAY * 2 ** (item.retryCount - 1), MAX_RETRY_DELAY)

  log.info('OfflineService', `⏰ Scheduling retry for ${item.id} in ${delay}ms`)

  const timeout = setTimeout(() => {
    retryTimeouts.delete(item.id)
    if (isOnlineStatus()) {
      processQueue()
    }
  }, delay)

  retryTimeouts.set(item.id, timeout)
}

/**
 * Get offline queue from storage
 */
function getQueue(): OfflineQueue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (_error) {}

  return {
    items: [],
    isProcessing: false,
    lastSync: null,
  }
}

/**
 * Save offline queue to storage
 */
function saveQueue(queue: OfflineQueue): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch (_error) {}
}

/**
 * Convert File to base64 for storage
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert base64 back to File
 */
function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  totalItems: number
  pendingItems: number
  failedItems: number
  lastSync: number | null
  isProcessing: boolean
} {
  const queue = getQueue()
  const failedItems = queue.items.filter(
    (item: OfflineQueueItem) => item.retryCount >= item.maxRetries
  ).length

  return {
    totalItems: queue.items.length,
    pendingItems: queue.items.length - failedItems,
    failedItems,
    lastSync: queue.lastSync,
    isProcessing,
  }
}

/**
 * Retry failed items
 */
export function retryFailedItems(): void {
  const queue = getQueue()

  // Reset retry count for failed items
  queue.items.forEach((item: OfflineQueueItem) => {
    if (item.retryCount >= item.maxRetries) {
      item.retryCount = 0
      item.error = null
    }
  })

  saveQueue(queue)

  if (isOnlineStatus()) {
    processQueue()
  }
}

/**
 * Clear completed items from queue
 */
export function clearQueue(): void {
  const queue: OfflineQueue = {
    items: [],
    isProcessing: false,
    lastSync: Date.now(),
  }

  saveQueue(queue)

  // Clear all retry timeouts
  retryTimeouts.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout))
  retryTimeouts.clear()
}

/**
 * Cleanup service
 */
export function cleanup(): void {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)

  // Clear all retry timeouts
  retryTimeouts.forEach((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout))
  retryTimeouts.clear()
}

// Hook for using offline service in React components
export const useOfflineService = () => {
  const [queueStats, setQueueStats] = React.useState(getQueueStats())
  const [isOnline, setIsOnline] = React.useState(isOnlineStatus())

  React.useEffect(() => {
    initialize()

    // Update stats periodically
    const interval = setInterval(() => {
      setQueueStats(getQueueStats())
      setIsOnline(isOnlineStatus())
    }, 1000)

    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [])

  return {
    isOnline,
    queueStats,
    queueVideoUpload,
    queueAnalysisJob,
    queueVideoDelete,
    retryFailedItems,
    clearQueue,
    processQueue,
  }
}
