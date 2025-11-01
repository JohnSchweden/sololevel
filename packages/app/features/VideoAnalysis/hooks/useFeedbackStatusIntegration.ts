import { useFeedbackStatusStore } from '@app/features/VideoAnalysis/stores/feedbackStatus'
import { log } from '@my/logging'
import { useEffect, useMemo, useRef, useState } from 'react'

type FeedbackState = ReturnType<typeof useFeedbackStatusStore.getState> extends infer StoreState
  ? StoreState extends { getFeedbacksByAnalysisId: (analysisId: string) => infer T }
    ? T
    : never
  : never

/**
 * Hook to integrate feedback status tracking with VideoAnalysis components
 * Automatically subscribes to feedback status updates for a given analysis
 */
export function useFeedbackStatusIntegration(analysisId?: string) {
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

  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (!analysisId) {
      return false
    }
    const state = useFeedbackStatusStore.getState()
    return state.subscriptions.has(analysisId)
  })

  const [subscriptionStatus, setSubscriptionStatus] = useState<
    'idle' | 'pending' | 'active' | 'failed'
  >(() => {
    if (!analysisId) {
      return 'idle'
    }
    const state = useFeedbackStatusStore.getState()
    const status = state.subscriptionStatus.get(analysisId) as
      | 'pending'
      | 'active'
      | 'failed'
      | undefined
    return status ?? 'idle'
  })

  // Track active analysis to avoid duplicate subscribe/unsubscribe loops when the
  // same analysisId is provided repeatedly in quick succession (StrictMode rerenders).
  const lastAnalysisIdRef = useRef<string | undefined>(undefined)
  const lastSubscriptionAttemptRef = useRef<number>(0)
  const isSubscribingRef = useRef<boolean>(false) // Track in-flight subscription attempts
  const mountCountRef = useRef<number>(0) // Track mount cycles for StrictMode diagnosis

  // Sync local state when analysis ID changes and subscribe to store updates
  useEffect(() => {
    mountCountRef.current += 1
    const currentMount = mountCountRef.current

    if (!analysisId) {
      log.debug('useFeedbackStatusIntegration', 'Resetting state - no analysisId', {
        mountCycle: currentMount,
      })
      setFeedbacks([])
      setIsSubscribed(false)
      setSubscriptionStatus('idle')
      lastAnalysisIdRef.current = undefined
      isSubscribingRef.current = false // Reset subscribing flag
      return
    }

    log.debug('useFeedbackStatusIntegration', 'Syncing state for analysisId change', {
      analysisId,
      previousAnalysisId: lastAnalysisIdRef.current,
      mountCycle: currentMount,
    })

    const sync = () => {
      const state = useFeedbackStatusStore.getState()
      const storeFeedbacks = state.getFeedbacksByAnalysisId(analysisId)

      // Immediately sync feedbacks from store (might be prefetched)
      setFeedbacks(storeFeedbacks)
      setIsSubscribed(state.subscriptions.has(analysisId))
      const status = state.subscriptionStatus.get(analysisId) as
        | 'pending'
        | 'active'
        | 'failed'
        | undefined
      setSubscriptionStatus(status ?? 'idle')

      log.debug('useFeedbackStatusIntegration', 'Synced feedbacks from store', {
        analysisId,
        count: storeFeedbacks.length,
        isSubscribed: state.subscriptions.has(analysisId),
        status: status ?? 'idle',
      })
    }

    // Sync immediately (might have prefetched data)
    sync()

    const unsubscribeStore = useFeedbackStatusStore.subscribe(
      (state) => ({
        feedbacks: state.getFeedbacksByAnalysisId(analysisId),
        isSubscribed: state.subscriptions.has(analysisId),
        status: state.subscriptionStatus.get(analysisId) as
          | 'pending'
          | 'active'
          | 'failed'
          | undefined,
      }),
      (next) => {
        const previousStatus = subscriptionStatus
        setFeedbacks(next.feedbacks)
        setIsSubscribed(next.isSubscribed)
        setSubscriptionStatus(next.status ?? 'idle')

        // Reset subscribing flag when status becomes active or failed
        if (
          (previousStatus === 'pending' || previousStatus === 'idle') &&
          (next.status === 'active' || next.status === 'failed')
        ) {
          isSubscribingRef.current = false
        }
      }
    )

    return () => {
      log.debug('useFeedbackStatusIntegration', 'Cleanup: unsubscribing from store updates', {
        analysisId,
        mountCycle: currentMount,
      })
      unsubscribeStore()
    }
  }, [analysisId])

  // Log subscription status changes
  useEffect(() => {
    if (analysisId && isSubscribed) {
      log.info('useFeedbackStatusIntegration', `Subscribed to feedbacks for analysis ${analysisId}`)
    }
  }, [analysisId, isSubscribed])

  // Subscribe/unsubscribe based on analysis ID using a ref guard to prevent churn
  useEffect(() => {
    if (!analysisId) {
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
      lastAnalysisIdRef.current === analysisId &&
      (isSubscribed || subscriptionStatus === 'pending' || subscriptionStatus === 'active')

    if (alreadySubscribed) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - already subscribed/active for ${analysisId}`,
        {
          isSubscribed,
          subscriptionStatus,
          lastAnalysisId: lastAnalysisIdRef.current,
        }
      )
      return undefined
    }

    if (subscriptionStatus === 'failed') {
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
  }, [analysisId])

  // Debug dependency changes
  useEffect(() => {}, [analysisId, isSubscribed, subscriptionStatus])

  // Transform feedback data for UI components
  // Stabilize by comparing content signatures instead of array reference - prevents unnecessary recreations
  // Create signature from properties that affect the transformed items
  const feedbacksSignature = feedbacks
    .map(
      (f) =>
        `${f.id}:${f.ssmlStatus}:${f.audioStatus}:${f.timestampSeconds}:${f.message?.substring(0, 20)}:${f.confidence}:${f.category}`
    )
    .join('|')
  const prevFeedbackItemsRef = useRef<any[]>([])
  const prevFeedbacksSignatureRef = useRef<string>('')

  const feedbackItems = useMemo(() => {
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
    const items = feedbacks.map((feedback) => ({
      id: feedback.id.toString(),
      timestamp: feedback.timestampSeconds * 1000, // Convert to milliseconds for UI
      text: feedback.message,
      type: 'suggestion' as const, // Default type, could be enhanced based on category
      category: feedback.category as 'voice' | 'posture' | 'grip' | 'movement',
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

  // Helper functions for specific feedback operations
  const getFeedbackById = (feedbackId: string) => {
    const numericId = Number.parseInt(feedbackId, 10)
    return getFeedbackByIdFromStore(numericId)
  }

  const retryFailedFeedback = (feedbackId: string) => {
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
  }

  const cleanup = () => {
    if (analysisId) {
      useFeedbackStatusStore.getState().unsubscribeFromAnalysis(analysisId)
      log.info('useFeedbackStatusIntegration', `Cleaned up subscription for analysis ${analysisId}`)
    }
  }

  return {
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
  }
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
