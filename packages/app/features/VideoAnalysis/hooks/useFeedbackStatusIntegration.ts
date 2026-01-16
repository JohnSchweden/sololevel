import { useFeedbackStatusStore } from '@app/features/VideoAnalysis/stores/feedbackStatus'
import type { FeedbackPanelItem } from '@app/features/VideoAnalysis/types'
import { supabase } from '@my/api'
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

  // History mode: One-time fetch without subscription
  // This is more efficient than realtime for completed analyses
  const historyFetchedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!analysisId || !isHistoryMode) {
      return
    }

    // Skip if already fetched for this analysis
    if (historyFetchedRef.current === analysisId) {
      return
    }

    // Check if we already have data in cache
    const cachedFeedbacks = useFeedbackStatusStore.getState().getFeedbacksByAnalysisId(analysisId)
    if (cachedFeedbacks.length > 0) {
      log.debug('useFeedbackStatusIntegration', 'History mode: using cached feedbacks', {
        analysisId,
        count: cachedFeedbacks.length,
      })
      historyFetchedRef.current = analysisId
      return
    }

    // One-time fetch for history mode
    log.info('useFeedbackStatusIntegration', 'History mode: fetching feedbacks once', {
      analysisId,
    })
    historyFetchedRef.current = analysisId

    const fetchFeedbacks = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('analysis_feedback')
          .select(
            'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
          )
          .eq('analysis_id', analysisId)
          .order('timestamp_seconds', { ascending: true })

        if (error) {
          log.error('useFeedbackStatusIntegration', 'History fetch failed', { analysisId, error })
          return
        }

        if (data && data.length > 0) {
          const store = useFeedbackStatusStore.getState()
          data.forEach((feedback: any) => {
            store.addFeedback(feedback)
          })
          log.info('useFeedbackStatusIntegration', 'History mode: loaded feedbacks', {
            analysisId,
            count: data.length,
          })
        }
      } catch (err) {
        log.error('useFeedbackStatusIntegration', 'History fetch error', {
          analysisId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    void fetchFeedbacks()
  }, [analysisId, isHistoryMode])

  // Subscribe/unsubscribe based on analysis ID using a ref guard to prevent churn
  // Skip subscription in history mode - uses one-time fetch above instead
  useEffect(() => {
    if (!analysisId || isHistoryMode) {
      if (isHistoryMode && analysisId) {
        log.debug(
          'useFeedbackStatusIntegration',
          `Skipping realtime subscription in history mode for ${analysisId}`
        )
      }
      return undefined
    }

    // PRIMARY GUARD: Check in-flight flag first (state-based, most reliable)
    // This prevents duplicate subscriptions even if network is slow (>100ms)
    if (isSubscribingRef.current) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - already in progress for ${analysisId}`
      )
      return undefined
    }

    // SECONDARY GUARD: Debounce check (time-based, prevents rapid-fire attempts)
    // Only reaches here if no subscription is in-flight
    const now = Date.now()
    if (now - lastSubscriptionAttemptRef.current < 100) {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - debounced (${now - lastSubscriptionAttemptRef.current}ms ago)`
      )
      return undefined
    }
    lastSubscriptionAttemptRef.current = now

    // PERF: Check store status directly to catch early subscription from title callback
    // Early subscription is created in analysisSubscription.ts title callback to catch events
    // before screen renders. This eliminates duplicate subscription attempts.
    const storeStatus = useFeedbackStatusStore.getState().subscriptionStatus.get(analysisId)
    if (storeStatus === 'active' || storeStatus === 'pending') {
      log.debug(
        'useFeedbackStatusIntegration',
        `Skipping subscription - early subscription already active/pending for ${analysisId}`,
        {
          storeStatus,
        }
      )
      return undefined
    }

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
      // MEMORY LEAK FIX: Always unsubscribe, using lastAnalysisIdRef if analysisId changed
      // This prevents subscriptions from persisting when guards change or component unmounts
      // The store handles idempotent unsubscribe calls safely
      const idToUnsubscribe = analysisId ?? lastAnalysisIdRef.current
      if (idToUnsubscribe) {
        useFeedbackStatusStore.getState().unsubscribeFromAnalysis(idToUnsubscribe)
      }
      isSubscribingRef.current = false // Reset on cleanup
      lastAnalysisIdRef.current = undefined // Clear ref on cleanup
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
      ssmlStatus: feedback.ssmlStatus as FeedbackPanelItem['ssmlStatus'],
      audioStatus: feedback.audioStatus as FeedbackPanelItem['audioStatus'],
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
    // Split failures: SSML failures block analysis, audio failures are graceful degradation
    const hasBlockingFailures = feedbacks.some((f) => f.ssmlStatus === 'failed')
    const hasAudioFailures = feedbacks.some((f) => f.audioStatus === 'failed')
    const hasFailures = hasBlockingFailures || hasAudioFailures // Keep for backward compatibility
    const isProcessing = feedbacks.some(
      (f) =>
        f.ssmlStatus === 'processing' ||
        f.audioStatus === 'processing' ||
        f.audioStatus === 'retrying'
    )

    return {
      total,
      ssmlCompleted,
      audioCompleted,
      fullyCompleted,
      hasBlockingFailures,
      hasAudioFailures,
      hasFailures,
      isProcessing,
      completionPercentage: total > 0 ? Math.round((fullyCompleted / total) * 100) : 0,
    }
  }, [feedbacks])

  // STALENESS POLLING: Fallback mechanism when Realtime silently fails
  // If feedbacks are stuck in processing state, poll DB every 3s as a safety net
  // This catches cases where WebSocket disconnects without triggering CHANNEL_ERROR
  // SSML is typically ready within 1-2s, so 3s polling catches stuck state quickly
  const STALENESS_POLL_INTERVAL_MS = 3000 // 3 seconds
  const stalenessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Only poll when:
    // 1. We have an analysisId
    // 2. We have feedbacks that are still processing
    // 3. Not in history mode (completed analyses don't need polling)
    const shouldPoll = analysisId && stats.isProcessing && !isHistoryMode && feedbacks.length > 0

    if (shouldPoll) {
      // Clear any existing interval before starting new one
      if (stalenessIntervalRef.current) {
        clearInterval(stalenessIntervalRef.current)
      }

      log.debug('useFeedbackStatusIntegration', 'Starting staleness polling', {
        analysisId,
        isProcessing: stats.isProcessing,
        feedbackCount: feedbacks.length,
      })

      stalenessIntervalRef.current = setInterval(async () => {
        try {
          // Skip polling if realtime is healthy (received events recently)
          const diagnostics = useFeedbackStatusStore.getState().getDiagnostics(analysisId)
          const realtimeHealthy =
            diagnostics?.lastEventReceivedAt && Date.now() - diagnostics.lastEventReceivedAt < 10000

          if (realtimeHealthy) {
            if (__DEV__) {
              log.debug(
                'useFeedbackStatusIntegration',
                'Staleness poll: skipping - realtime healthy',
                {
                  analysisId,
                  lastEventAgoMs: Date.now() - (diagnostics?.lastEventReceivedAt ?? 0),
                }
              )
            }
            return
          }

          log.debug('useFeedbackStatusIntegration', 'Staleness poll: fetching fresh data', {
            analysisId,
          })

          // Record staleness poll for diagnostics
          useFeedbackStatusStore.getState().recordDiagnosticEvent(analysisId, 'staleness_poll')

          const { data, error } = await supabase
            .from('analysis_feedback')
            .select(
              'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
            )
            .eq('analysis_id', analysisId)
            .order('created_at', { ascending: true })

          if (error) {
            log.warn('useFeedbackStatusIntegration', 'Staleness poll fetch failed', {
              analysisId,
              error: error.message,
            })
            return
          }

          if (data && data.length > 0) {
            const store = useFeedbackStatusStore.getState()
            let updatedCount = 0

            data.forEach((freshFeedback: any) => {
              const existing = store.getFeedbackById(freshFeedback.id)
              // Only update if status actually changed (avoid unnecessary re-renders)
              if (
                existing &&
                (existing.ssmlStatus !== freshFeedback.ssml_status ||
                  existing.audioStatus !== freshFeedback.audio_status)
              ) {
                store.updateFeedback(freshFeedback.id, freshFeedback)
                updatedCount++
              } else if (!existing) {
                // Feedback not in store yet, add it
                store.addFeedback(freshFeedback)
                updatedCount++
              }
            })

            if (updatedCount > 0) {
              log.info('useFeedbackStatusIntegration', 'Staleness poll: updated stale feedbacks', {
                analysisId,
                updatedCount,
                totalFetched: data.length,
              })
              // Record staleness update for diagnostics
              useFeedbackStatusStore
                .getState()
                .recordDiagnosticEvent(analysisId, 'staleness_update')
            }
          }
        } catch (err) {
          log.warn('useFeedbackStatusIntegration', 'Staleness poll error', {
            analysisId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }, STALENESS_POLL_INTERVAL_MS)
    } else {
      // Clear interval when no longer processing
      if (stalenessIntervalRef.current) {
        log.debug('useFeedbackStatusIntegration', 'Stopping staleness polling', {
          analysisId,
          isProcessing: stats.isProcessing,
        })
        clearInterval(stalenessIntervalRef.current)
        stalenessIntervalRef.current = null
      }
    }

    return () => {
      if (stalenessIntervalRef.current) {
        clearInterval(stalenessIntervalRef.current)
        stalenessIntervalRef.current = null
      }
    }
  }, [analysisId, stats.isProcessing, isHistoryMode, feedbacks.length])

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

  // Get diagnostics for debugging Realtime issues
  const diagnostics = analysisId
    ? useFeedbackStatusStore.getState().getDiagnostics(analysisId)
    : null

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
      hasFailures: stats.hasFailures, // Backward compatibility - includes all failures
      hasBlockingFailures: stats.hasBlockingFailures, // SSML failures only
      hasAudioFailures: stats.hasAudioFailures, // Audio failures only
      isFullyCompleted: stats.total > 0 && stats.fullyCompleted === stats.total,

      // Actions
      getFeedbackById,
      retryFailedFeedback,
      cleanup,

      // Diagnostics for debugging Realtime issues (access via __DEV__ check in UI)
      diagnostics,
    }),
    [
      feedbackItems,
      feedbacks,
      stats,
      isSubscribed,
      getFeedbackById,
      retryFailedFeedback,
      cleanup,
      diagnostics,
    ]
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
