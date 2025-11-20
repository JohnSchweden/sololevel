import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { useAnalysisSubscriptionStore } from '@app/features/VideoAnalysis/stores/analysisSubscription'
import { useUploadProgressStore } from '@app/features/VideoAnalysis/stores/uploadProgress'
import { analysisKeys } from '@app/hooks/analysisKeys'
import type { AnalysisJob } from '@app/hooks/useAnalysis'
import { useAnalysisJob, useAnalysisJobByVideoId } from '@app/hooks/useAnalysis'
import { useUploadProgress } from '@app/hooks/useVideoUpload'
import { mockFeedbackItems } from '@app/mocks/feedback'
import { useFeatureFlagsStore } from '@app/stores/feature-flags'
import { safeSetQueryData } from '@app/utils/safeCacheUpdate'
import { getAnalysisIdForJobId, supabase } from '@my/api'
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

/**
 * Aggregates the current upload, analysis, and feedback pipeline state for a recording.
 * Consumers rely on the stable references returned here to avoid unnecessary re-renders.
 */
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
}

type UploadProgressStatus = 'pending' | 'uploading' | 'completed' | 'failed'

interface UploadProgressData {
  status: UploadProgressStatus
  percentage?: number
}

const COMPLETION_THRESHOLD = 100

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
  job?: AnalysisJob | null,
  simulateFailure = false
): {
  status: AnalysisJob['status']
  progress: number
  error: string | null
} => {
  // Feature flag: Simulate analysis failure for testing retry UI
  // This works even when no job exists yet (creates a mock failed job)
  if (simulateFailure) {
    if (!job) {
      // Simulate a failed job even when no job exists (for immediate testing)
      return {
        status: 'failed' as AnalysisJob['status'],
        progress: 50,
        error:
          'Simulated analysis failure for testing. Click "Try Again" to test retry functionality.',
      }
    }
    // If job exists and is not already failed, simulate failure
    if (job.status !== 'failed') {
      return {
        status: 'failed' as AnalysisJob['status'],
        progress: coerceProgress(job.progress_percentage ?? 50),
        error:
          'Simulated analysis failure for testing. Click "Try Again" to test retry functionality.',
      }
    }
    // If job is already failed, return the real error (allows testing retry on real failures)
  }

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

/**
 * Subscribes to upload progress, realtime analysis updates, and feedback status for a recording.
 * Provides memoized state that powers the video analysis experience without triggering render storms.
 *
 * @param analysisJobId - Optional Supabase job identifier to track the active analysis run.
 * @param videoRecordingId - Optional recording identifier used to resolve upload progress and subscriptions.
 * @param _initialStatus - Reserved for legacy hydration flow; defaults to `'processing'`.
 * @param isHistoryMode - Flag indicating whether data should be treated as read-only historical analysis.
 * @returns Consolidated, memoized analysis state that stays stable between identical snapshots.
 */
export function useAnalysisState(
  analysisJobId?: number,
  videoRecordingId?: number,
  _initialStatus: 'processing' | 'ready' = 'processing',
  isHistoryMode = false
): AnalysisStateResult {
  const latestUploadTask = useUploadProgressStore((state) =>
    isHistoryMode ? null : state.getLatestActiveTask()
  )

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

  const shouldSubscribeToRealtime = !isHistoryMode

  const subscribe = useAnalysisSubscriptionStore((state) => state.subscribe)
  const unsubscribe = useAnalysisSubscriptionStore((state) => state.unsubscribe)

  // PERF FIX: Use individual primitive selectors to eliminate object allocation
  // Instead of returning an entry object, subscribe to individual primitives
  // This eliminates the object hop and prevents "useSyncExternalStore result" churn
  useEffect(() => {
    if (!shouldSubscribeToRealtime || !subscriptionKey) {
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
  }, [
    analysisJobId,
    derivedRecordingId,
    subscribe,
    unsubscribe,
    subscriptionKey,
    shouldSubscribeToRealtime,
  ])

  // Get the analysis job from TanStack Query (single source of truth)
  // Try to get job by analysisJobId first, then by videoRecordingId
  const jobIdQuery = useAnalysisJob(analysisJobId ?? 0)
  const jobByVideoQuery = useAnalysisJobByVideoId(derivedRecordingId ?? 0)

  // Prefer analysisJobId result, fallback to videoRecordingId result
  const analysisJob = jobIdQuery.data ?? jobByVideoQuery.data ?? null

  // Derive analysis job ID early so it can be used in callbacks
  const derivedAnalysisJobId = analysisJobId ?? analysisJob?.id ?? null

  const queryClient = useQueryClient()

  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)

  const [analysisUuid, setAnalysisUuid] = useState<string | null>(() => {
    // Try to get UUID from cache synchronously (check multiple cache layers)
    const effectiveJobId = analysisJobId ?? null
    if (effectiveJobId) {
      // Check TanStack Query cache first (in-memory, fastest)
      let cachedUuid = queryClient.getQueryData<string>(analysisKeys.uuid(effectiveJobId))
      // Fallback to persisted store (survives app restarts)
      if (!cachedUuid) {
        cachedUuid = getUuid(effectiveJobId) ?? undefined
        if (cachedUuid) {
          // Restore to TanStack Query cache for faster subsequent lookups
          safeSetQueryData(
            queryClient,
            analysisKeys.uuid(effectiveJobId),
            cachedUuid,
            'useAnalysisState.initial'
          )
        }
      }
      if (cachedUuid) {
        log.debug('useAnalysisState', 'Using cached UUID', {
          analysisJobId: effectiveJobId,
          uuid: cachedUuid,
          source: queryClient.getQueryData(analysisKeys.uuid(effectiveJobId))
            ? 'tanstack'
            : 'persisted',
        })
        return cachedUuid
      }
    }
    return null
  })
  useEffect(() => {
    const effectiveJobId = analysisJobId ?? analysisJob?.id ?? null

    if (!effectiveJobId) {
      setAnalysisUuid(null)
      return
    }

    // Check multiple cache layers (fastest first)
    let cachedUuid = queryClient.getQueryData<string>(analysisKeys.uuid(effectiveJobId))
    if (!cachedUuid) {
      cachedUuid = getUuid(effectiveJobId) ?? undefined
      if (cachedUuid) {
        // Restore to TanStack Query cache for faster subsequent lookups
        safeSetQueryData(
          queryClient,
          analysisKeys.uuid(effectiveJobId),
          cachedUuid,
          'useAnalysisState.effect'
        )
      }
    }
    if (cachedUuid) {
      if (analysisUuid !== cachedUuid) {
        log.debug('useAnalysisState', 'Using cached UUID from effect', {
          analysisJobId: effectiveJobId,
          uuid: cachedUuid,
          source: queryClient.getQueryData(analysisKeys.uuid(effectiveJobId))
            ? 'tanstack'
            : 'persisted',
        })
        setAnalysisUuid(cachedUuid)
      }
      return
    }

    const abortController = new AbortController()

    const resolveUuid = async () => {
      try {
        const uuid = await getAnalysisIdForJobId(effectiveJobId, {
          signal: abortController.signal,
        })

        if (!abortController.signal.aborted && uuid) {
          // Cache UUID in both TanStack Query (fast) and persisted store (survives restarts)
          safeSetQueryData(
            queryClient,
            analysisKeys.uuid(effectiveJobId),
            uuid,
            'useAnalysisState.resolveUuid'
          )
          setUuid(effectiveJobId, uuid)
          setAnalysisUuid(uuid)
        } else if (!abortController.signal.aborted) {
          setAnalysisUuid(null)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Aborted, ignore
          return
        }
        if (__DEV__ && !abortController.signal.aborted) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          log.error('useAnalysisState', 'Failed to resolve analysis UUID', {
            jobId: effectiveJobId,
            error: message,
          })
        }
        if (!abortController.signal.aborted) {
          setAnalysisUuid(null)
        }
      }
    }

    void resolveUuid()

    return () => {
      abortController.abort()
    }
  }, [analysisJobId, analysisJob?.id, queryClient])

  const feedbackStatus = useFeedbackStatusIntegration(analysisUuid ?? undefined, isHistoryMode)

  // Check feature flags
  const useMockData = useFeatureFlagsStore((state) => state.flags.useMockData)
  const simulateAnalysisFailure = useFeatureFlagsStore(
    (state) => state.flags.simulateAnalysisFailure
  )

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
    // Ensure feedbackStatus is always an object (defensive guard)
    // This should never happen as useFeedbackStatusIntegration always returns an object,
    // but we guard against it for safety
    if (!feedbackStatus) {
      const defaultFeedback: FeedbackState = {
        feedbackItems: [],
        feedbacks: [],
        stats: {
          total: 0,
          ssmlCompleted: 0,
          audioCompleted: 0,
          fullyCompleted: 0,
          hasFailures: false,
          isProcessing: false,
          completionPercentage: 0,
        },
        isSubscribed: false,
        isProcessing: false,
        hasFailures: false,
        isFullyCompleted: false,
        getFeedbackById: () => null,
        retryFailedFeedback: () => {},
        cleanup: () => {},
      }
      return feedbackWithFallbackRef.current || defaultFeedback
    }

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
    if (signature === prevFeedbackFallbackSignatureRef.current && feedbackWithFallbackRef.current) {
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

  const analysisStatus = deriveAnalysisStatus(analysisJob, simulateAnalysisFailure)
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
    // Only allow retry for analysis errors (not upload errors)
    if (phase !== 'error' || !error || error.phase !== 'analysis') {
      log.warn('useAnalysisState', 'Retry called but not in analysis error state', {
        phase,
        errorPhase: error?.phase,
      })
      return
    }

    // Need videoRecordingId to restart analysis
    if (!derivedRecordingId) {
      log.error('useAnalysisState', 'Cannot retry analysis - missing videoRecordingId', {
        analysisJobId: derivedAnalysisJobId,
      })
      return
    }

    try {
      log.info('useAnalysisState', 'Retrying analysis', {
        videoRecordingId: derivedRecordingId,
        previousJobId: derivedAnalysisJobId,
      })

      // Call Edge Function to restart analysis with videoRecordingId
      // The Edge Function will create a new analysis job and start processing
      const { data, error: invokeError } = await supabase.functions.invoke('ai-analyze-video', {
        body: {
          videoRecordingId: derivedRecordingId,
          videoSource: 'uploaded_video',
        },
      })

      if (invokeError) {
        log.error('useAnalysisState', 'Failed to restart analysis', {
          videoRecordingId: derivedRecordingId,
          error: invokeError.message,
        })
        throw new Error(`Failed to restart analysis: ${invokeError.message}`)
      }

      log.info('useAnalysisState', 'Analysis restart initiated', {
        videoRecordingId: derivedRecordingId,
        newAnalysisId: data?.analysisId,
      })

      // The subscription will automatically pick up the new job via recordingId
      // No need to manually retry subscription - it's already subscribed to recordingId
    } catch (error) {
      log.error('useAnalysisState', 'Error during analysis retry', {
        videoRecordingId: derivedRecordingId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }, [
    phase,
    error,
    derivedRecordingId,
    derivedAnalysisJobId,
    shouldSubscribeToRealtime,
    subscriptionKey,
  ])

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
    ]
  )
}
