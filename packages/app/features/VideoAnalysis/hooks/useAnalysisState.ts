import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

  const [analysisUuid, setAnalysisUuid] = useState<string | null>(null)
  const [channelExhausted, setChannelExhausted] = useState(false)

  useEffect(() => {
    const effectiveJobId = analysisJobId ?? analysisJob?.id ?? null

    if (!effectiveJobId) {
      setAnalysisUuid(null)
      return
    }

    let cancelled = false

    const resolveUuid = async () => {
      try {
        const uuidPromise = getAnalysisIdForJobId(effectiveJobId)
        const uuid = uuidPromise instanceof Promise ? await uuidPromise : uuidPromise

        if (!cancelled) {
          setAnalysisUuid(uuid ?? null)
        }
      } catch (error) {
        if (__DEV__ && !cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          log.error('useAnalysisState', 'Failed to resolve analysis UUID', {
            jobId: effectiveJobId,
            error: message,
          })
        }
      }
    }

    void resolveUuid()

    return () => {
      cancelled = true
    }
  }, [analysisJobId, analysisJob?.id])

  const feedbackStatus = useFeedbackStatusIntegration(analysisUuid ?? undefined)

  // Check feature flag for mock data control
  const useMockData = useFeatureFlagsStore((state) => state.flags.useMockData)

  // Apply mock fallback strategy based on feature flag
  const feedbackWithFallback = useMemo(() => {
    // Use real feedback items if available
    if (feedbackStatus.feedbackItems.length > 0) {
      return {
        ...feedbackStatus,
        feedbackItems: feedbackStatus.feedbackItems,
      }
    }

    // Only use mock data if feature flag is enabled
    const items = useMockData ? (mockFeedbackItems as typeof feedbackStatus.feedbackItems) : []

    return {
      ...feedbackStatus,
      feedbackItems: items,
    }
  }, [feedbackStatus, useMockData])

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

  return {
    phase,
    isProcessing: phase !== 'ready' && phase !== 'error',
    progress,
    videoRecordingId: derivedRecordingId ?? null,
    analysisJobId: analysisJobId ?? analysisJob?.id ?? null,
    analysisUuid,
    error,
    retry,
    feedback: feedbackWithFallback, // Return feedback with mock fallback applied
    firstPlayableReady,
    channelExhausted,
  }
}
