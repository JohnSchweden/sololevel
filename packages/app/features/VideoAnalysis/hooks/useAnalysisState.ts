import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useVideoHistoryStore } from '@app/features/HistoryProgress/stores/videoHistory'
import { useAnalysisSubscriptionStore } from '@app/features/VideoAnalysis/stores/analysisSubscription'
import { useUploadProgressStore } from '@app/features/VideoAnalysis/stores/uploadProgress'
import type { AnalysisJob } from '@app/hooks/useAnalysis'
import { useAnalysisJobBatched } from '@app/hooks/useAnalysis'
import { useUploadProgress } from '@app/hooks/useVideoUpload'
import { mockFeedbackItems } from '@app/mocks/feedback'
import { useFeatureFlagsStore } from '@app/stores/feature-flags'
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

  // Only SSML failures block video playback - audio failures are graceful degradation
  if (feedback.hasBlockingFailures) {
    return {
      phase: 'error',
      error: {
        phase: 'feedback',
        message: 'Feedback generation failed',
      },
    }
  }

  // CRITICAL: In history mode, skip all processing checks - video is already playable.
  // Must be checked BEFORE analysisStatus === 'completed' because:
  // - First navigation: analysisStatus=pending → would fall through to isHistoryMode check (worked)
  // - Subsequent navigations: analysisStatus=completed (cached) → would hit 'generating-feedback' (bug!)
  // Feedback items will populate lazily via useFeedbackStatusIntegration subscription.
  if (isHistoryMode) {
    return { phase: 'ready', error: null }
  }

  if (feedback.isFullyCompleted || firstPlayableReady) {
    return { phase: 'ready', error: null }
  }

  // NEW: analysis_complete = video analysis done, SSML/Audio processing via /post-analyze
  if (analysisStatus.status === 'analysis_complete') {
    return { phase: 'generating-feedback', error: null }
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

  // CRITICAL FIX: Use ref to preserve recordingId once we have it
  // Prevents subscription from being deleted when upload completes and latestUploadTask becomes null
  const recordingIdRef = useRef<number | null>(null)

  const derivedRecordingId = useMemo(() => {
    // If videoRecordingId is provided as prop, always use it (stable)
    if (videoRecordingId) {
      return videoRecordingId
    }

    // If we have a recordingId from upload task, use it
    if (typeof latestUploadTask?.videoRecordingId === 'number') {
      return latestUploadTask.videoRecordingId
    }

    // If upload completed but we have a stored recordingId, keep using it
    // This prevents subscription from being deleted when latestUploadTask becomes null
    if (recordingIdRef.current !== null) {
      return recordingIdRef.current
    }

    return null
  }, [videoRecordingId, latestUploadTask])

  // FIX: Move ref updates to effect to avoid side effects during render
  // React 19 concurrent features can render multiple times before commit
  // Writing to refs during render causes inconsistent state between concurrent renders
  useEffect(() => {
    if (derivedRecordingId !== null) {
      recordingIdRef.current = derivedRecordingId
    }
  }, [derivedRecordingId])

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
  // MEMORY LEAK FIX: Always unsubscribe in cleanup, regardless of guard state
  // This prevents subscriptions from persisting when shouldSubscribeToRealtime changes
  useEffect(() => {
    // If we shouldn't subscribe, ensure we're unsubscribed and return early
    if (!shouldSubscribeToRealtime || !subscriptionKey) {
      // Unsubscribe if we have a subscription key (idempotent)
      if (subscriptionKey) {
        unsubscribe(subscriptionKey)
      }
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

    // PERF: Skip screen subscription if early subscription already exists
    // Early subscription is created in upload callback to catch events before screen renders
    // This eliminates duplicate subscription attempts and DEBUG log noise
    const existingStatus = useAnalysisSubscriptionStore.getState().getStatus(subscriptionKey)
    if (existingStatus === 'active' || existingStatus === 'pending') {
      // Early subscription already active - screen subscription not needed
      // Cleanup will still unsubscribe when component unmounts (idempotent)
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
      // MEMORY LEAK FIX: Always unsubscribe, even if guard conditions changed
      // Store handles idempotent unsubscribe calls safely
      if (subscriptionKey) {
        unsubscribe(subscriptionKey)
      }
    }
  }, [
    analysisJobId,
    derivedRecordingId,
    subscribe,
    unsubscribe,
    subscriptionKey,
    shouldSubscribeToRealtime, // Re-added: effect must re-run when this changes to trigger cleanup
  ])

  // Get the analysis job from TanStack Query (single source of truth)
  // Batched query: only one query runs (by analysisJobId if available, else by videoRecordingId)
  // This reduces parallel query overhead and improves mount performance
  const jobQuery = useAnalysisJobBatched(
    analysisJobId ?? undefined,
    derivedRecordingId ?? undefined
  )

  // Get the job from the batched query result
  const analysisJob = jobQuery.data ?? null

  // Derive analysis job ID early so it can be used in callbacks
  const derivedAnalysisJobId = analysisJobId ?? analysisJob?.id ?? null

  const queryClient = useQueryClient()

  const getUuid = useVideoHistoryStore((state) => state.getUuid)
  const setUuid = useVideoHistoryStore((state) => state.setUuid)
  // Subscribe to hydration state to re-check cache after store hydrates
  const isHydrated = useVideoHistoryStore((state) => state._isHydrated)

  // FIX: Subscribe to UUID from Zustand store directly
  // This ensures we react immediately when the UUID is stored from the title subscription
  // The title subscription (analysisSubscription.ts) stores the UUID as soon as the analyses row is created
  // which happens right after LLM analysis, BEFORE SSML/audio generation
  const effectiveJobIdForUuid = derivedAnalysisJobId
  const cachedUuid = useVideoHistoryStore((state) =>
    effectiveJobIdForUuid ? state.getUuid(effectiveJobIdForUuid) : null
  )

  const [analysisUuid, setAnalysisUuid] = useState<string | null>(() => {
    const effectiveJobId = analysisJobId ?? null
    return effectiveJobId ? getUuid(effectiveJobId) : null
  })

  // Sync UUID from Zustand subscription
  useEffect(() => {
    if (cachedUuid && cachedUuid !== analysisUuid) {
      setAnalysisUuid(cachedUuid)
    }
  }, [cachedUuid, analysisUuid])

  // Resolve UUID from API if not in cache
  useEffect(() => {
    const effectiveJobId = analysisJobId ?? analysisJob?.id ?? null
    if (!effectiveJobId) {
      setAnalysisUuid(null)
      return
    }

    const cachedUuid = getUuid(effectiveJobId)
    if (cachedUuid) {
      if (analysisUuid !== cachedUuid) {
        setAnalysisUuid(cachedUuid)
      }
      return
    }

    const abortController = new AbortController()

    getAnalysisIdForJobId(effectiveJobId, { signal: abortController.signal })
      .then((uuid) => {
        if (!abortController.signal.aborted && uuid) {
          setUuid(effectiveJobId, uuid)
          setAnalysisUuid(uuid)
        } else if (!abortController.signal.aborted) {
          setAnalysisUuid(null)
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
        if (__DEV__ && !abortController.signal.aborted) {
          log.error('useAnalysisState', 'Failed to resolve analysis UUID', {
            jobId: effectiveJobId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
        if (!abortController.signal.aborted) {
          setAnalysisUuid(null)
        }
      })

    return () => abortController.abort()
  }, [analysisJobId, analysisJob?.id, queryClient, isHydrated, getUuid, setUuid])

  const feedbackStatus = useFeedbackStatusIntegration(analysisUuid ?? undefined, isHistoryMode)

  // Check feature flags
  const useMockData = useFeatureFlagsStore((state) => state.flags.useMockData)
  const simulateAnalysisFailure = useFeatureFlagsStore(
    (state) => state.flags.simulateAnalysisFailure
  )

  // Stabilize feedback items using content-based memoization
  const feedbackSignature = useMemo(() => {
    return feedbackStatus.feedbackItems
      .map((item) => `${item.id}:${item.ssmlStatus}:${item.audioStatus}`)
      .join(',')
  }, [feedbackStatus.feedbackItems])

  const stableFeedbackItems = useMemo(() => {
    return feedbackStatus.feedbackItems
  }, [feedbackSignature])

  // Apply mock fallback strategy based on feature flag
  const feedbackWithFallback = useMemo(() => {
    const shouldSkipMock = isHistoryMode && analysisJobId && analysisUuid === null
    const shouldUseMock = stableFeedbackItems.length === 0 && useMockData && !shouldSkipMock

    const items = shouldUseMock
      ? (mockFeedbackItems as typeof feedbackStatus.feedbackItems)
      : stableFeedbackItems

    return {
      ...feedbackStatus,
      feedbackItems: items,
    }
  }, [stableFeedbackItems, feedbackStatus, useMockData, isHistoryMode, analysisJobId, analysisUuid])

  // Only terminal states make video playable initially
  // 'retrying' is included for retry flow (video already playable, stays playable)
  const PLAYABLE_AUDIO_STATUSES = new Set(['completed', 'failed', 'retrying'])

  // Latch: once video becomes playable, it stays playable for this analysis session
  // This prevents flicker when status transitions (e.g., retrying → queued → processing → completed)
  const hasBeenPlayableRef = useRef(false)
  const previousAnalysisUuidRef = useRef<string | null>(null)

  // Reset latch when analysis changes (but not on initial resolution from null)
  useEffect(() => {
    // Only reset if analysisUuid actually changed between non-null values
    // This prevents resetting when UUID resolves from null → actual UUID
    if (
      previousAnalysisUuidRef.current !== null &&
      analysisUuid !== null &&
      previousAnalysisUuidRef.current !== analysisUuid
    ) {
      hasBeenPlayableRef.current = false
    }
    previousAnalysisUuidRef.current = analysisUuid
  }, [analysisUuid])

  const firstPlayableReady = useMemo(() => {
    // Use real feedback items (not fallback) for playability detection
    if (!feedbackStatus.feedbackItems.length) {
      return false
    }

    const earliest = feedbackStatus.feedbackItems.reduce(
      (previous, current) => {
        return !previous || current.timestamp < previous.timestamp ? current : previous
      },
      null as (typeof feedbackStatus.feedbackItems)[0] | null
    )

    // Check if current status is playable
    const isCurrentlyPlayable =
      earliest !== null && PLAYABLE_AUDIO_STATUSES.has(earliest.audioStatus ?? '')

    // Latch: once playable, stay playable (prevents flicker during status transitions)
    if (isCurrentlyPlayable) {
      hasBeenPlayableRef.current = true
    }

    return hasBeenPlayableRef.current
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
