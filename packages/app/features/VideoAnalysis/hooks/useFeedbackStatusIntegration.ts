import { useFeedbackStatusStore } from '@app/features/VideoAnalysis/stores/feedbackStatus'
import type { FeedbackPanelItem } from '@app/features/VideoAnalysis/types'
import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type FeedbackState = ReturnType<typeof useFeedbackStatusStore.getState> extends infer StoreState
  ? StoreState extends { getFeedbacksByAnalysisId: (analysisId: string) => infer T }
    ? T
    : never
  : never

export type NormalizedFeedbackCategory = FeedbackPanelItem['category']

export const normalizeFeedbackCategory = (category: string): NormalizedFeedbackCategory => {
  const normalized = category?.trim().toLowerCase() ?? ''

  if (normalized.includes('posture')) {
    return 'posture'
  }

  if (normalized.includes('movement')) {
    return 'movement'
  }

  if (normalized.includes('grip')) {
    return 'grip'
  }

  if (
    normalized.includes('speech') ||
    normalized.includes('voice') ||
    normalized.includes('vocal')
  ) {
    return 'voice'
  }

  return 'voice'
}

const createFeedbackSignature = (items: FeedbackState): string =>
  items
    .map((item) =>
      [
        item.id,
        item.analysisId,
        item.message,
        item.category,
        item.timestampSeconds,
        item.confidence,
        item.ssmlStatus,
        item.audioStatus,
        item.ssmlAttempts,
        item.audioAttempts,
        item.ssmlLastError ?? '',
        item.audioLastError ?? '',
        item.ssmlUpdatedAt,
        item.audioUpdatedAt,
        item.updatedAt,
        item.isSubscribed ? '1' : '0',
      ].join(':')
    )
    .join('|')

/**
 * Hook to integrate feedback status tracking with VideoAnalysis components
 * Automatically subscribes to feedback status updates for a given analysis
 */
export function useFeedbackStatusIntegration(analysisId?: string, isHistoryMode = false) {
  // CRITICAL: Don't destructure these from the store - it causes rerenders
  // Access via getState() instead to stabilize function references
  const getFeedbackByIdFromStore = useFeedbackStatusStore((state) => state.getFeedbackById)
  const setSSMLStatus = useFeedbackStatusStore((state) => state.setSSMLStatus)
  const setAudioStatus = useFeedbackStatusStore((state) => state.setAudioStatus)

  // Initialize with store data immediately (might have prefetched data)
  const [feedbacks, setFeedbacks] = useState<FeedbackState>(() => {
    if (!analysisId) {
      return []
    }
    const state = useFeedbackStatusStore.getState()
    return state.getFeedbacksByAnalysisId(analysisId)
  })
  const feedbackSignatureRef = useRef<string>(createFeedbackSignature(feedbacks))

  // Replace render-time subscription status selectors with effect-based refs to prevent re-renders
  const isSubscriptionActiveOrPendingRef = useRef(false)
  const isSubscriptionFailedRef = useRef(false)
  const isSubscribedRef = useRef(false)

  // Initialize isSubscribedRef with current store state
  if (!isSubscribedRef.current && analysisId) {
    const state = useFeedbackStatusStore.getState()
    isSubscribedRef.current = state.subscriptions.has(analysisId)
  }

  // Effect to update refs when subscription status changes (no re-render)
  useEffect(() => {
    if (!analysisId) {
      isSubscriptionActiveOrPendingRef.current = false
      isSubscriptionFailedRef.current = false
      isSubscribedRef.current = false
      return
    }

    const updateRefs = (status?: string) => {
      isSubscriptionActiveOrPendingRef.current = status === 'pending' || status === 'active'
      isSubscriptionFailedRef.current = status === 'failed'
    }

    // Initialize with current state
    const currentStatus = useFeedbackStatusStore.getState().subscriptionStatus.get(analysisId)
    const state = useFeedbackStatusStore.getState()
    isSubscribedRef.current = state.subscriptions.has(analysisId)
    updateRefs(currentStatus)

    // Subscribe to changes (effect-based, no re-render)
    return useFeedbackStatusStore.subscribe(
      (state) => state.subscriptionStatus.get(analysisId),
      (status) => updateRefs(status)
    )
  }, [analysisId])

  // Computed values for render (read from refs, no selectors)
  const isSubscriptionActiveOrPending = isSubscriptionActiveOrPendingRef.current
  const isSubscriptionFailed = isSubscriptionFailedRef.current
  const isSubscribed = isSubscribedRef.current

  // Track active analysis to avoid duplicate subscribe/unsubscribe loops when the
  // same analysisId is provided repeatedly in quick succession (StrictMode rerenders).
  const lastAnalysisIdRef = useRef<string | undefined>(undefined)
  const lastSubscriptionAttemptRef = useRef<number>(0)
  const isSubscribingRef = useRef<boolean>(false) // Track in-flight subscription attempts
  const mountCountRef = useRef<number>(0) // Track mount cycles for StrictMode diagnosis

  const updateFeedbacksState = useCallback((nextFeedbacks: FeedbackState) => {
    const nextSignature = createFeedbackSignature(nextFeedbacks)
    setFeedbacks((previous) => {
      const prevSignature = feedbackSignatureRef.current

      if (previous.length === nextFeedbacks.length && prevSignature === nextSignature) {
        return previous
      }

      feedbackSignatureRef.current = nextSignature
      return nextFeedbacks
    })
  }, [])

  // Sync local state when analysis ID changes and subscribe to store updates
  useEffect(() => {
    mountCountRef.current += 1
    const currentMount = mountCountRef.current

    if (!analysisId) {
      log.debug('useFeedbackStatusIntegration', 'Resetting state - no analysisId', {
        mountCycle: currentMount,
      })
      updateFeedbacksState([])
      isSubscribedRef.current = false
      lastAnalysisIdRef.current = undefined
      isSubscribingRef.current = false // Reset subscribing flag
      return
    }

    const sync = () => {
      const state = useFeedbackStatusStore.getState()
      const storeFeedbacks = state.getFeedbacksByAnalysisId(analysisId)

      // Immediately sync feedbacks from store (might be prefetched)
      updateFeedbacksState(storeFeedbacks)
      isSubscribedRef.current = state.subscriptions.has(analysisId)
    }

    // Sync immediately (might have prefetched data)
    sync()

    const unsubscribeStore = useFeedbackStatusStore.subscribe(
      (state) => ({
        feedbacks: state.getFeedbacksByAnalysisId(analysisId),
        isSubscribed: state.subscriptions.has(analysisId),
      }),
      (next) => {
        updateFeedbacksState(next.feedbacks)
        isSubscribedRef.current = next.isSubscribed
      }
    )

    return () => {
      unsubscribeStore()
    }
  }, [analysisId, updateFeedbacksState])

  // Subscribe/unsubscribe based on analysis ID using a ref guard to prevent churn
  // Skip subscription in history mode - data should be prefetched and in cache
  useEffect(() => {
    if (!analysisId || isHistoryMode) {
      if (isHistoryMode && analysisId) {
        log.debug(
          'useFeedbackStatusIntegration',
          `Skipping subscription in history mode - using prefetched data for ${analysisId}`
        )
      }
      return undefined
    }

    // CRITICAL: Guard against concurrent subscription attempts
    if (isSubscribingRef.current) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - already in progress for ${analysisId}`
      )
      return undefined
    }

    // Debounce: prevent subscription attempts more frequent than 100ms
    const now = Date.now()
    if (now - lastSubscriptionAttemptRef.current < 100) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - debounced (${now - lastSubscriptionAttemptRef.current}ms ago)`
      )
      return undefined
    }
    lastSubscriptionAttemptRef.current = now

    // CRITICAL: Guard against re-subscription if already subscribed or attempting
    const alreadySubscribed =
      lastAnalysisIdRef.current === analysisId && (isSubscribed || isSubscriptionActiveOrPending)

    if (alreadySubscribed) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - already subscribed/active for ${analysisId}`,
        {
          isSubscribed,
          isSubscriptionActiveOrPending,
          isSubscriptionFailed,
          lastAnalysisId: lastAnalysisIdRef.current,
        }
      )
      return undefined
    }

    if (isSubscriptionFailed) {
      log.warn(
        'useFeedbackStatusIntegration',
        `Realtime disabled for analysis ${analysisId} after repeated failures`
      )
      return undefined
    }

    // Mark as subscribing to prevent concurrent attempts
    isSubscribingRef.current = true
    lastAnalysisIdRef.current = analysisId

    log.info('useFeedbackStatusIntegration', `Initiating subscription for analysis ${analysisId}`)

    // Access store directly to avoid dependency on function reference
    useFeedbackStatusStore
      .getState()
      .subscribeToAnalysisFeedbacks(analysisId)
      .catch((error) => {
        log.error(
          'useFeedbackStatusIntegration',
          `Failed to subscribe to analysis ${analysisId}`,
          error
        )
        isSubscribingRef.current = false // Reset on failure
      })

    return () => {
      log.debug('useFeedbackStatusIntegration', 'Cleanup effect running', {
        analysisId,
        lastAnalysisId: lastAnalysisIdRef.current,
        wasSubscribing: isSubscribingRef.current,
      })
      if (lastAnalysisIdRef.current === analysisId) {
        // Access store directly to avoid dependency on function reference
        useFeedbackStatusStore.getState().unsubscribeFromAnalysis(analysisId)
        isSubscribingRef.current = false // Reset on cleanup
      }
    }
  }, [analysisId, isHistoryMode])

  // Debug dependency changes (subscription status values now read from refs, no re-renders)
  useEffect(() => {}, [analysisId, isSubscribed])

  // Transform feedback data for UI components
  // Stabilize by comparing content signatures instead of array reference - prevents unnecessary recreations
  // Create signature from properties that affect the transformed items
  const feedbacksSignature = feedbacks
    .map(
      (f) =>
        `${f.id}:${f.ssmlStatus}:${f.audioStatus}:${f.timestampSeconds}:${f.message?.substring(0, 20)}:${f.confidence}:${f.category}`
    )
    .join('|')
  const prevFeedbackItemsRef = useRef<FeedbackPanelItem[]>([])
  const prevFeedbacksSignatureRef = useRef<string>('')

  const feedbackItems = useMemo<FeedbackPanelItem[]>(() => {
    // Only recreate if signature actually changed (content changed), not just reference
    const prevSignature = prevFeedbacksSignatureRef.current

    if (
      prevSignature === feedbacksSignature &&
      prevFeedbackItemsRef.current.length === feedbacks.length
    ) {
      // Content is the same, return previous array to maintain stable reference
      return prevFeedbackItemsRef.current
    }

    // Content changed, create new array
    const items = feedbacks.map<FeedbackPanelItem>((feedback) => ({
      id: feedback.id.toString(),
      timestamp: feedback.timestampSeconds * 1000, // Convert to milliseconds for UI
      text: feedback.message,
      type: 'suggestion', // Default type, could be enhanced based on category
      category: normalizeFeedbackCategory(feedback.category),
      ssmlStatus: feedback.ssmlStatus,
      audioStatus: feedback.audioStatus,
      confidence: feedback.confidence,
    }))

    if (__DEV__) {
      // const breakdown = items.reduce(
      //   (acc, item) => {
      //     acc.ssmlStatus = acc.ssmlStatus || {}
      //     acc.audioStatus = acc.audioStatus || {}
      //     acc.ssmlStatus[item.ssmlStatus] = (acc.ssmlStatus[item.ssmlStatus] || 0) + 1
      //     acc.audioStatus[item.audioStatus] = (acc.audioStatus[item.audioStatus] || 0) + 1
      //     return acc
      //   },
      //   {} as { ssmlStatus: Record<string, number>; audioStatus: Record<string, number> }
      // )
      // log.debug('FeedbackIntegration', 'transformed feedback items', {
      //   totalFeedbacks: feedbacks.length,
      //   transformedItems: items.length,
      //   statusBreakdown: breakdown,
      //   sampleItems: items.slice(0, 3).map((item) => ({
      //     id: item.id,
      //     audioStatus: item.audioStatus,
      //     ssmlStatus: item.ssmlStatus,
      //   })),
      // })
    }

    prevFeedbacksSignatureRef.current = feedbacksSignature
    prevFeedbackItemsRef.current = items

    return items
  }, [feedbacksSignature, feedbacks.length])

  // Statistics for UI display
  const stats = useMemo(() => {
    const total = feedbacks.length
    const ssmlCompleted = feedbacks.filter((f) => f.ssmlStatus === 'completed').length
    const audioCompleted = feedbacks.filter((f) => f.audioStatus === 'completed').length
    const fullyCompleted = feedbacks.filter(
      (f) => f.ssmlStatus === 'completed' && f.audioStatus === 'completed'
    ).length
    const hasFailures = feedbacks.some(
      (f) => f.ssmlStatus === 'failed' || f.audioStatus === 'failed'
    )
    const isProcessing = feedbacks.some(
      (f) => f.ssmlStatus === 'processing' || f.audioStatus === 'processing'
    )

    return {
      total,
      ssmlCompleted,
      audioCompleted,
      fullyCompleted,
      hasFailures,
      isProcessing,
      completionPercentage: total > 0 ? Math.round((fullyCompleted / total) * 100) : 0,
    }
  }, [feedbacks])

  // Helper functions for specific feedback operations - memoized for stability
  const getFeedbackById = useCallback(
    (feedbackId: string) => {
      const numericId = Number.parseInt(feedbackId, 10)
      return getFeedbackByIdFromStore(numericId)
    },
    [getFeedbackByIdFromStore]
  )

  const retryFailedFeedback = useCallback(
    (feedbackId: string) => {
      const numericId = Number.parseInt(feedbackId, 10)
      const feedback = getFeedbackByIdFromStore(numericId)

      if (!feedback) {
        log.warn('useFeedbackStatusIntegration', `Feedback ${feedbackId} not found for retry`)
        return
      }

      // Reset failed statuses to queued for retry
      if (feedback.ssmlStatus === 'failed') {
        setSSMLStatus(numericId, 'queued')
        log.info('useFeedbackStatusIntegration', `Retrying SSML for feedback ${feedbackId}`)
      }

      if (feedback.audioStatus === 'failed') {
        setAudioStatus(numericId, 'queued')
        log.info('useFeedbackStatusIntegration', `Retrying audio for feedback ${feedbackId}`)
      }
    },
    [getFeedbackByIdFromStore, setSSMLStatus, setAudioStatus]
  )

  const cleanup = useCallback(() => {
    if (analysisId) {
      useFeedbackStatusStore.getState().unsubscribeFromAnalysis(analysisId)
      log.info('useFeedbackStatusIntegration', `Cleaned up subscription for analysis ${analysisId}`)
    }
  }, [analysisId])

  // Memoize return value to prevent cascading re-renders
  // Only recreate when actual data changes, not on every render
  return useMemo(
    () => ({
      // Data
      feedbackItems,
      feedbacks,
      stats,
      isSubscribed,

      // Status checks
      isProcessing: stats.isProcessing,
      hasFailures: stats.hasFailures,
      isFullyCompleted: stats.total > 0 && stats.fullyCompleted === stats.total,

      // Actions
      getFeedbackById,
      retryFailedFeedback,
      cleanup,
    }),
    [feedbackItems, feedbacks, stats, isSubscribed, getFeedbackById, retryFailedFeedback, cleanup]
  )
}

/**
 * Hook for monitoring overall feedback processing status across all analyses
 * Useful for global loading indicators or statistics
 */
export function useGlobalFeedbackStatus() {
  const store = useFeedbackStatusStore()
  const stats = store.getStats()

  const isProcessingAny = store.processingSSMLCount > 0 || store.processingAudioCount > 0
  const hasFailures = stats.ssmlFailed > 0 || stats.audioFailed > 0
  const totalProcessing = store.processingSSMLCount + store.processingAudioCount

  return {
    stats,
    isProcessingAny,
    hasFailures,
    totalProcessing,
    activeSubscriptions: store.subscriptions.size,
  }
}
