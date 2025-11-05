import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import type { AnalysisJob } from '@app/features/VideoAnalysis/stores/analysisSubscription'
import { useAnalysisSubscriptionStore } from '@app/features/VideoAnalysis/stores/analysisSubscription'
import { useUploadProgressStore } from '@app/features/VideoAnalysis/stores/uploadProgress'
import { useUploadProgress } from '@app/hooks/useVideoUpload'
import { mockFeedbackItems } from '@app/mocks/feedback'
import { useFeatureFlagsStore } from '@app/stores/feature-flags'
import { getAnalysisIdForJobId } from '@my/api'
import { log } from '@my/logging'

import { useFeedbackStatusIntegration } from './useFeedbackStatusIntegration'

type FeedbackState = ReturnType<typeof useFeedbackStatusIntegration>

export type AnalysisPhase =
  | 'uploading'
  | 'upload-complete'
  | 'analyzing'
  | 'generating-feedback'
  | 'ready'
  | 'error'

export interface AnalysisStateResult {
  phase: AnalysisPhase
  isProcessing: boolean
  progress: {
    upload: number
    analysis: number
    feedback: number
  }
  videoRecordingId: number | null
  analysisJobId: number | null
  analysisUuid: string | null
  thumbnailUrl?: string | null
  error: {
    phase: 'upload' | 'analysis' | 'feedback'
    message: string
  } | null
  retry: () => Promise<void>
  feedback: FeedbackState
  firstPlayableReady: boolean
  channelExhausted: boolean
}

type UploadProgressStatus = 'pending' | 'uploading' | 'completed' | 'failed'

interface UploadProgressData {
  status: UploadProgressStatus
  percentage?: number
}

interface SubscriptionEntry {
  job?: AnalysisJob | null
  status?: 'idle' | 'pending' | 'active' | 'failed'
}

type SubscriptionMap = Map<string, SubscriptionEntry>

interface SubscriptionStateSnapshot {
  job?: AnalysisJob | null
  status: 'idle' | 'pending' | 'active' | 'failed'
}

const COMPLETION_THRESHOLD = 100

const getSubscriptionEntry = (
  subscriptions: SubscriptionMap,
  key: string | null
): SubscriptionStateSnapshot | null => {
  if (!key) {
    return null
  }

  const entry = subscriptions.get(key)
  if (!entry) {
    return null
  }

  return {
    job: entry.job ?? null,
    status: entry.status ?? 'idle',
  }
}

const resolveSubscriptionKey = (analysisJobId?: number, videoRecordingId?: number | null) => {
  if (analysisJobId) {
    return `job:${analysisJobId}`
  }

  if (typeof videoRecordingId === 'number' && videoRecordingId > 0) {
    return `recording:${videoRecordingId}`
  }

  return null
}

const coerceProgress = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.min(COMPLETION_THRESHOLD, Math.round(value)))
}

const deriveUploadStatus = (uploadProgress?: UploadProgressData | null) => {
  if (!uploadProgress) {
    return {
      status: 'pending' as UploadProgressStatus,
      progress: 0,
    }
  }

  return {
    status: uploadProgress.status,
    progress: coerceProgress(uploadProgress.percentage),
  }
}

const deriveAnalysisStatus = (
  job?: AnalysisJob | null
): {
  status: AnalysisJob['status']
  progress: number
  error: string | null
} => {
  if (!job) {
    return {
      status: 'pending' as AnalysisJob['status'],
      progress: 0,
      error: null,
    }
  }

  const rawStatus = job.status
  const status = (typeof rawStatus === 'string' ? rawStatus : 'pending') as AnalysisJob['status']
  const rawError = job.error_message
  const error = typeof rawError === 'string' ? rawError : null

  return {
    status,
    progress: coerceProgress(job.progress_percentage ?? 0),
    error,
  }
}

const deriveFeedbackProgress = (feedbackItems: FeedbackState['feedbackItems']) => {
  if (!feedbackItems.length) {
    return 0
  }

  const completed = feedbackItems.filter((item) => item.audioStatus === 'completed').length

  return coerceProgress((completed / feedbackItems.length) * 100)
}

const determinePhase = (params: {
  uploadStatus: ReturnType<typeof deriveUploadStatus>
  analysisStatus: ReturnType<typeof deriveAnalysisStatus>
  feedback: FeedbackState
  firstPlayableReady: boolean
  uploadError: string | null
  isHistoryMode: boolean
}): { phase: AnalysisPhase; error: AnalysisStateResult['error'] } => {
  const { uploadStatus, analysisStatus, feedback, firstPlayableReady, uploadError, isHistoryMode } =
    params

  if (uploadStatus.status === 'failed') {
    return {
      phase: 'error',
      error: {
        phase: 'upload',
        message: uploadError ?? 'Upload failed',
      },
    }
  }

  if (analysisStatus.status === 'failed') {
    return {
      phase: 'error',
      error: {
        phase: 'analysis',
        message: analysisStatus.error ?? 'Analysis failed',
      },
    }
  }

  if (feedback.hasFailures) {
    return {
      phase: 'error',
      error: {
        phase: 'feedback',
        message: 'Feedback generation failed',
      },
    }
  }

  if (feedback.isFullyCompleted || firstPlayableReady) {
    return { phase: 'ready', error: null }
  }

  if (analysisStatus.status === 'completed') {
    return { phase: 'generating-feedback', error: null }
  }

  if (analysisStatus.status === 'processing' || analysisStatus.status === 'queued') {
    return { phase: 'analyzing', error: null }
  }

  if (uploadStatus.status === 'completed') {
    return { phase: 'upload-complete', error: null }
  }

  if (isHistoryMode) {
    // In history mode, if we have feedback items, we're ready (data is prefetched)
    // Only return 'generating-feedback' if we truly don't have feedback yet
    if (feedback.feedbackItems.length > 0) {
      return { phase: 'ready', error: null }
    }
    return { phase: 'generating-feedback', error: null }
  }

  return { phase: 'uploading', error: null }
}

const selectUploadTask = (recordingId: number | null) => {
  if (!recordingId) {
    return null
  }

  return useUploadProgressStore.getState().getTaskByRecordingId(recordingId)
}

export function useAnalysisState(
  analysisJobId?: number,
  videoRecordingId?: number,
  _initialStatus: 'processing' | 'ready' = 'processing',
  isHistoryMode = false
): AnalysisStateResult {
  const latestUploadTask = useUploadProgressStore((state) => state.getLatestActiveTask())

  const derivedRecordingId = useMemo(() => {
    if (videoRecordingId) {
      return videoRecordingId
    }

    if (typeof latestUploadTask?.videoRecordingId === 'number') {
      return latestUploadTask.videoRecordingId
    }

    return null
  }, [videoRecordingId, latestUploadTask])

  const uploadProgressRecordId = derivedRecordingId ?? latestUploadTask?.videoRecordingId ?? null
  const uploadQuery = useUploadProgress(uploadProgressRecordId ?? 0)
  const uploadStatus = useMemo((): ReturnType<typeof deriveUploadStatus> => {
    if (!uploadProgressRecordId) {
      return deriveUploadStatus()
    }

    return deriveUploadStatus(uploadQuery.data)
  }, [uploadProgressRecordId, uploadQuery.data])

  const subscriptionKey = useMemo(
    () => resolveSubscriptionKey(analysisJobId, derivedRecordingId),
    [analysisJobId, derivedRecordingId]
  )

  const subscribe = useAnalysisSubscriptionStore((state) => state.subscribe)
  const unsubscribe = useAnalysisSubscriptionStore((state) => state.unsubscribe)
  const retrySubscription = useAnalysisSubscriptionStore((state) => state.retry)
  const subscriptions = useAnalysisSubscriptionStore((state) => state.subscriptions)

  const subscriptionSnapshot = getSubscriptionEntry(subscriptions, subscriptionKey)

  useEffect(() => {
    if (!subscriptionKey) {
      return undefined
    }

    const options = analysisJobId
      ? { analysisJobId }
      : derivedRecordingId
        ? { recordingId: derivedRecordingId }
        : null

    if (!options) {
      return undefined
    }

    let isMounted = true

    void subscribe(subscriptionKey, options).catch((error: unknown) => {
      if (!isMounted) {
        return
      }

      if (__DEV__) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        log.error('useAnalysisState', 'Failed to subscribe', {
          key: subscriptionKey,
          options,
          error: message,
        })
      }
    })

    return () => {
      isMounted = false
      unsubscribe(subscriptionKey)
    }
  }, [analysisJobId, derivedRecordingId, subscribe, unsubscribe, subscriptionKey])

  const analysisJob = subscriptionSnapshot?.job ?? null
  const queryClient = useQueryClient()

  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)

  const [analysisUuid, setAnalysisUuid] = useState<string | null>(() => {
    // Try to get UUID from cache synchronously (check multiple cache layers)
    const effectiveJobId = analysisJobId ?? null
    if (effectiveJobId) {
      // Check TanStack Query cache first (in-memory, fastest)
      let cachedUuid = queryClient.getQueryData<string>(['analysis', 'uuid', effectiveJobId])
      // Fallback to persisted store (survives app restarts)
      if (!cachedUuid) {
        cachedUuid = getUuid(effectiveJobId) ?? undefined
        if (cachedUuid) {
          // Restore to TanStack Query cache for faster subsequent lookups
          queryClient.setQueryData(['analysis', 'uuid', effectiveJobId], cachedUuid)
        }
      }
      if (cachedUuid) {
        log.debug('useAnalysisState', 'Using cached UUID', {
          analysisJobId: effectiveJobId,
          uuid: cachedUuid,
          source: queryClient.getQueryData(['analysis', 'uuid', effectiveJobId])
            ? 'tanstack'
            : 'persisted',
        })
        return cachedUuid
      }
    }
    return null
  })
  const [channelExhausted, setChannelExhausted] = useState(false)

  useEffect(() => {
    const effectiveJobId = analysisJobId ?? analysisJob?.id ?? null

    if (!effectiveJobId) {
      setAnalysisUuid(null)
      return
    }

    // Check multiple cache layers (fastest first)
    let cachedUuid = queryClient.getQueryData<string>(['analysis', 'uuid', effectiveJobId])
    if (!cachedUuid) {
      cachedUuid = getUuid(effectiveJobId) ?? undefined
      if (cachedUuid) {
        // Restore to TanStack Query cache for faster subsequent lookups
        queryClient.setQueryData(['analysis', 'uuid', effectiveJobId], cachedUuid)
      }
    }
    if (cachedUuid) {
      log.debug('useAnalysisState', 'Using cached UUID from effect', {
        analysisJobId: effectiveJobId,
        uuid: cachedUuid,
        source: queryClient.getQueryData(['analysis', 'uuid', effectiveJobId])
          ? 'tanstack'
          : 'persisted',
      })
      setAnalysisUuid(cachedUuid)
      return
    }

    let cancelled = false

    const resolveUuid = async () => {
      try {
        const uuidPromise = getAnalysisIdForJobId(effectiveJobId)
        const uuid = uuidPromise instanceof Promise ? await uuidPromise : uuidPromise

        if (!cancelled && uuid) {
          // Cache UUID in both TanStack Query (fast) and persisted store (survives restarts)
          queryClient.setQueryData(['analysis', 'uuid', effectiveJobId], uuid)
          setUuid(effectiveJobId, uuid)
          setAnalysisUuid(uuid)
        } else if (!cancelled) {
          setAnalysisUuid(null)
        }
      } catch (error) {
        if (__DEV__ && !cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          log.error('useAnalysisState', 'Failed to resolve analysis UUID', {
            jobId: effectiveJobId,
            error: message,
          })
        }
        if (!cancelled) {
          setAnalysisUuid(null)
        }
      }
    }

    void resolveUuid()

    return () => {
      cancelled = true
    }
  }, [analysisJobId, analysisJob?.id, queryClient])

  const feedbackStatus = useFeedbackStatusIntegration(analysisUuid ?? undefined)

  // Check feature flag for mock data control
  const useMockData = useFeatureFlagsStore((state) => state.flags.useMockData)

  /**
   * Stabilize feedbackItems array reference to prevent mount/unmount thrashing.
   *
   * Even though useFeedbackStatusIntegration stabilizes the array, we need to stabilize
   * it here as well because feedbackWithFallback spreads feedbackStatus which creates
   * a new object. By comparing content (IDs and properties), we ensure the array
   * reference only changes when actual data changes.
   *
   * Performance impact: Prevents FeedbackPanel from mounting/unmounting items
   * when only object references change, not content.
   */
  const stableFeedbackItemsRef = useRef<typeof feedbackStatus.feedbackItems>([])
  const prevFeedbackItemsSignatureRef = useRef<string>('')

  // Create signature from feedback items content (IDs and key properties)
  const feedbackItemsSignature = feedbackStatus.feedbackItems
    .map(
      (item) =>
        `${item.id}:${item.timestamp}:${item.text?.substring(0, 20)}:${item.type}:${item.category}:${item.ssmlStatus}:${item.audioStatus}:${item.confidence}`
    )
    .join('|')

  const stableFeedbackItems = useMemo(() => {
    const prevSignature = prevFeedbackItemsSignatureRef.current
    const currentItems = feedbackStatus.feedbackItems

    // Compare signatures - if unchanged, return previous array reference
    if (
      prevSignature === feedbackItemsSignature &&
      stableFeedbackItemsRef.current.length === currentItems.length
    ) {
      return stableFeedbackItemsRef.current
    }

    // Content changed - update refs synchronously during render
    prevFeedbackItemsSignatureRef.current = feedbackItemsSignature
    stableFeedbackItemsRef.current = currentItems
    return currentItems
  }, [feedbackItemsSignature, feedbackStatus.feedbackItems])

  // Apply mock fallback strategy based on feature flag
  // BUT: Skip mock data if we're in history mode and analysisJobId exists (might have prefetched data)
  // CRITICAL: Use stableFeedbackItems instead of feedbackStatus.feedbackItems to maintain reference stability
  // CRITICAL: Return a stable reference using useRef to prevent cascading re-renders
  const feedbackWithFallbackRef = useRef(feedbackStatus)
  const prevFeedbackFallbackSignatureRef = useRef<string>('')

  const feedbackWithFallback = useMemo(() => {
    let items = stableFeedbackItems

    // In history mode with analysisJobId, skip mock data while UUID is being resolved
    if (
      stableFeedbackItems.length === 0 &&
      isHistoryMode &&
      analysisJobId &&
      analysisUuid === null
    ) {
      items = []
    } else if (stableFeedbackItems.length === 0 && useMockData) {
      // Only use mock data if feature flag is enabled
      items = mockFeedbackItems as typeof feedbackStatus.feedbackItems
    }

    // Create signature for content-based comparison
    const currentSignature = `${items.length}:${items.map((f) => `${f.id}:${f.ssmlStatus}:${f.audioStatus}`).join(',')}`
    const signature = `${currentSignature}:${feedbackStatus.hasFailures}:${feedbackStatus.isFullyCompleted}:${feedbackStatus.isProcessing}`

    // Only create new object if content actually changed
    if (signature === prevFeedbackFallbackSignatureRef.current) {
      return feedbackWithFallbackRef.current
    }

    const newFeedback = {
      ...feedbackStatus,
      feedbackItems: items,
    }

    prevFeedbackFallbackSignatureRef.current = signature
    feedbackWithFallbackRef.current = newFeedback
    return newFeedback
  }, [stableFeedbackItems, feedbackStatus, useMockData, isHistoryMode, analysisJobId, analysisUuid])

  useEffect(() => {
    if (!subscriptionKey) {
      setChannelExhausted(false)
      return
    }

    if (subscriptionSnapshot?.status === 'failed') {
      setChannelExhausted(true)
    } else if (
      subscriptionSnapshot?.status === 'active' ||
      subscriptionSnapshot?.status === 'pending'
    ) {
      setChannelExhausted(false)
    }
  }, [subscriptionKey, subscriptionSnapshot?.status])

  const firstPlayableReady = useMemo(() => {
    // Use real feedback items (not fallback) for playability detection
    if (!feedbackStatus.feedbackItems.length) {
      return false
    }

    const earliest = feedbackStatus.feedbackItems.reduce((previous, current) => {
      if (!previous) {
        return current
      }

      return current.timestamp < previous.timestamp ? current : previous
    })

    if (!earliest) {
      return false
    }

    return feedbackStatus.feedbackItems.some(
      (item) => item.id === earliest.id && item.audioStatus === 'completed'
    )
  }, [feedbackStatus.feedbackItems])

  const analysisStatus = deriveAnalysisStatus(analysisJob)
  // Use real feedback items (not fallback) for progress calculation
  const feedbackProgress = deriveFeedbackProgress(feedbackStatus.feedbackItems)

  const uploadTask = useMemo(() => {
    if (!uploadProgressRecordId) {
      return null
    }

    return selectUploadTask(uploadProgressRecordId)
  }, [uploadProgressRecordId])

  const uploadErrorMessage = uploadTask?.error ?? null

  // Use real feedback status (not fallback) for phase determination
  const { phase, error } = determinePhase({
    uploadStatus,
    analysisStatus,
    feedback: feedbackStatus,
    firstPlayableReady,
    uploadError: uploadErrorMessage,
    isHistoryMode,
  })

  // Debug: Log phase changes
  const lastPhaseDebugRef = useRef<AnalysisPhase | null>(null)
  if (lastPhaseDebugRef.current !== phase) {
    log.debug('useAnalysisState', '🔍 Phase changed', {
      from: lastPhaseDebugRef.current,
      to: phase,
      isHistoryMode,
      feedbackCount: feedbackStatus.feedbackItems.length,
      feedbackIsFullyCompleted: feedbackStatus.isFullyCompleted,
      analysisStatus: analysisStatus.status,
      uploadStatus: uploadStatus.status,
      firstPlayableReady,
    })
    lastPhaseDebugRef.current = phase
  }

  const progress = useMemo(
    () => ({
      upload: uploadStatus.progress,
      analysis: analysisStatus.progress,
      feedback: feedbackProgress,
    }),
    [uploadStatus.progress, analysisStatus.progress, feedbackProgress]
  )

  const retry = useCallback(async () => {
    if (!subscriptionKey) {
      return
    }

    await retrySubscription(subscriptionKey)
  }, [retrySubscription, subscriptionKey])

  const lastPhaseRef = useRef<AnalysisPhase | null>(null)

  useEffect(() => {
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase
    }
  }, [phase])

  // Get thumbnail URL from video history store if available (Task 33 Module 3)
  // Use Zustand selector to avoid render-phase store access
  const thumbnailUrl = useVideoHistoryStore((state) => {
    const jobId = analysisJobId ?? analysisJob?.id
    if (!jobId) {
      return undefined
    }

    const cached = state.getCached(jobId)
    return cached?.thumbnail
  })

  // Memoize return value to prevent cascading re-renders
  // This hook is called in performance-critical render paths
  const isProcessing = phase !== 'ready' && phase !== 'error'
  const derivedAnalysisJobId = analysisJobId ?? analysisJob?.id ?? null

  return useMemo(
    () => ({
      phase,
      isProcessing,
      progress,
      videoRecordingId: derivedRecordingId ?? null,
      analysisJobId: derivedAnalysisJobId,
      analysisUuid,
      thumbnailUrl,
      error,
      retry,
      feedback: feedbackWithFallback, // Return feedback with mock fallback applied
      firstPlayableReady,
      channelExhausted,
    }),
    [
      phase,
      isProcessing,
      progress,
      derivedRecordingId,
      derivedAnalysisJobId,
      analysisUuid,
      thumbnailUrl,
      error,
      retry,
      feedbackWithFallback,
      firstPlayableReady,
      channelExhausted,
    ]
  )
}
