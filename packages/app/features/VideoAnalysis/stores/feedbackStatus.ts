import { supabase } from '@my/api'
import { mmkvStorage } from '@my/config'
import { log } from '@my/logging'
import type { Draft } from 'immer'
import { enableMapSet } from 'immer'
import React from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// CRITICAL: Enable immer Map/Set support - without this, Map mutations are silently ignored!
enableMapSet()

// Types for feedback status tracking
export type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface FeedbackStatusData {
  id: number
  analysis_id: string
  message: string
  category: string
  timestamp_seconds: number
  confidence: number
  ssml_status: FeedbackProcessingStatus
  audio_status: FeedbackProcessingStatus
  ssml_attempts: number
  audio_attempts: number
  ssml_last_error: string | null
  audio_last_error: string | null
  ssml_updated_at: string
  audio_updated_at: string
  created_at: string
  updated_at: string
}

export interface FeedbackStatusState {
  id: number
  analysisId: string
  message: string
  category: string
  timestampSeconds: number
  confidence: number
  ssmlStatus: FeedbackProcessingStatus
  audioStatus: FeedbackProcessingStatus
  ssmlAttempts: number
  audioAttempts: number
  ssmlLastError: string | null
  audioLastError: string | null
  ssmlUpdatedAt: string
  audioUpdatedAt: string
  createdAt: string
  updatedAt: string
  lastUpdated: number
  isSubscribed: boolean
}

// Diagnostic info for debugging Realtime issues
export interface RealtimeDiagnostics {
  subscriptionCreatedAt: number | null
  subscriptionConfirmedAt: number | null
  lastEventReceivedAt: number | null
  eventsReceivedCount: number
  lastEventType: string | null
  lastEventFeedbackId: number | null
  stalenessPolls: number
  stalenessPollUpdates: number
}

export interface FeedbackStatusStore {
  // Feedback tracking
  feedbacks: Map<number, FeedbackStatusState>
  feedbacksByAnalysisId: Map<string, number[]> // analysisId -> feedbackIds[]
  analysisLastUpdated: Map<string, number>

  // Active subscriptions
  subscriptions: Map<string, () => void> // analysisId -> unsubscribe function
  subscriptionStatus: Map<string, 'pending' | 'active' | 'failed'>
  subscriptionRetries: Map<
    string,
    {
      attempts: number
      timeoutId: ReturnType<typeof setTimeout> | null
    }
  >
  // Backfill tracking - prevents subscription events during backfill fetch
  backfilling: Map<string, boolean> // analysisId -> isBackfilling
  // Abort controllers for backfill fetches - allows cancellation on unmount
  backfillAbortControllers: Map<string, AbortController> // analysisId -> AbortController
  // Abort controllers for initial fetches - allows cancellation on unmount
  initialFetchAbortControllers: Map<string, AbortController> // analysisId -> AbortController
  // Event queue for subscription events during backfill - prevents race conditions
  backfillEventQueues: Map<string, Array<{ payload: any; timestamp: number }>> // analysisId -> queued events

  // Diagnostics for debugging Realtime issues (per-analysis)
  diagnostics: Map<string, RealtimeDiagnostics>

  // Global state
  totalFeedbacks: number
  processingSSMLCount: number
  processingAudioCount: number
  completedCount: number
  failedCount: number
  lastGlobalUpdate: number

  // Actions
  addFeedback: (feedback: FeedbackStatusData) => void
  updateFeedback: (feedbackId: number, updates: Partial<FeedbackStatusData>) => void
  removeFeedback: (feedbackId: number) => void

  // Status management
  setSSMLStatus: (feedbackId: number, status: FeedbackProcessingStatus, error?: string) => void
  setAudioStatus: (feedbackId: number, status: FeedbackProcessingStatus, error?: string) => void

  // Query methods
  getFeedbacksByAnalysisId: (analysisId: string) => FeedbackStatusState[]
  getFeedbackById: (feedbackId: number) => FeedbackStatusState | null
  getProcessingFeedbacks: () => FeedbackStatusState[]

  // Subscription management
  subscribeToAnalysisFeedbacks: (analysisId: string) => Promise<void>
  unsubscribeFromAnalysis: (analysisId: string) => void
  unsubscribeAll: () => void

  // Statistics
  getStats: () => {
    total: number
    ssmlQueued: number
    ssmlProcessing: number
    ssmlCompleted: number
    ssmlFailed: number
    audioQueued: number
    audioProcessing: number
    audioCompleted: number
    audioFailed: number
    maxSSMLAttempts: number
    maxAudioAttempts: number
  }

  // Diagnostics for debugging Realtime issues
  getDiagnostics: (analysisId: string) => RealtimeDiagnostics | null
  recordDiagnosticEvent: (
    analysisId: string,
    event:
      | 'subscription_created'
      | 'subscription_confirmed'
      | 'event_received'
      | 'staleness_poll'
      | 'staleness_update',
    details?: { eventType?: string; feedbackId?: number }
  ) => void

  // Cleanup
  reset: () => void
}

const MAX_TRACKED_ANALYSES = 40
const MAX_STORED_FEEDBACKS = 400
const FEEDBACK_TTL_MS = 5 * 60 * 1000

/**
 * Process a feedback subscription event (INSERT, UPDATE, DELETE)
 * Extracted to a helper function so it can be called both immediately and from the event queue
 */
function processFeedbackEvent(payload: any, get: () => FeedbackStatusStore): void {
  const feedbackId = payload.new?.id || payload.old?.id
  const analysisId = payload.new?.analysis_id || payload.old?.analysis_id
  log.info('FeedbackStatusStore', 'Processing feedback event', {
    event: payload.eventType,
    feedbackId,
    analysisId,
    newAudioStatus: payload.new?.audio_status,
    newSSMLStatus: payload.new?.ssml_status,
    oldAudioStatus: payload.old?.audio_status,
    oldSSMLStatus: payload.old?.ssml_status,
    hasNewData: !!payload.new,
    hasOldData: !!payload.old,
  })

  // Record diagnostic event for debugging Realtime issues
  if (analysisId) {
    get().recordDiagnosticEvent(analysisId, 'event_received', {
      eventType: payload.eventType,
      feedbackId: typeof feedbackId === 'number' ? feedbackId : undefined,
    })
  }

  switch (payload.eventType) {
    case 'INSERT':
      if (payload.new) {
        get().addFeedback(payload.new as FeedbackStatusData)
      }
      break
    case 'UPDATE':
      if (payload.new) {
        get().updateFeedback(payload.new.id, payload.new as Partial<FeedbackStatusData>)
      }
      break
    case 'DELETE':
      if (payload.old) {
        get().removeFeedback(payload.old.id)
      }
      break
  }
}

const createFeedbackState = (feedback: FeedbackStatusData): FeedbackStatusState => ({
  id: feedback.id,
  analysisId: feedback.analysis_id,
  message: feedback.message,
  category: feedback.category,
  timestampSeconds: feedback.timestamp_seconds,
  confidence: feedback.confidence,
  ssmlStatus: feedback.ssml_status,
  audioStatus: feedback.audio_status,
  ssmlAttempts: feedback.ssml_attempts,
  audioAttempts: feedback.audio_attempts,
  ssmlLastError: feedback.ssml_last_error,
  audioLastError: feedback.audio_last_error,
  ssmlUpdatedAt: feedback.ssml_updated_at,
  audioUpdatedAt: feedback.audio_updated_at,
  createdAt: feedback.created_at,
  updatedAt: feedback.updated_at,
  lastUpdated: Date.now(),
  isSubscribed: false,
})

const markAnalysisTouched = (draft: Draft<FeedbackStatusStore>, analysisId: string): void => {
  draft.analysisLastUpdated.set(analysisId, Date.now())
}

const removeAnalysisFeedback = (draft: Draft<FeedbackStatusStore>, analysisId: string): void => {
  const feedbackIds = draft.feedbacksByAnalysisId.get(analysisId)
  if (!feedbackIds || feedbackIds.length === 0) {
    draft.analysisLastUpdated.delete(analysisId)
    return
  }

  let removedCount = 0

  feedbackIds.forEach((feedbackId) => {
    const existing = draft.feedbacks.get(feedbackId)
    if (!existing) {
      return
    }
    removedCount += 1

    if (existing.ssmlStatus === 'processing') {
      draft.processingSSMLCount = Math.max(0, draft.processingSSMLCount - 1)
    }
    if (existing.audioStatus === 'processing' || existing.audioStatus === 'retrying') {
      draft.processingAudioCount = Math.max(0, draft.processingAudioCount - 1)
    }
    if (existing.ssmlStatus === 'completed' && existing.audioStatus === 'completed') {
      draft.completedCount = Math.max(0, draft.completedCount - 1)
    }
    if (existing.ssmlStatus === 'failed' || existing.audioStatus === 'failed') {
      draft.failedCount = Math.max(0, draft.failedCount - 1)
    }

    draft.feedbacks.delete(feedbackId)
  })

  draft.totalFeedbacks = Math.max(0, draft.totalFeedbacks - removedCount)
  draft.feedbacksByAnalysisId.delete(analysisId)
  draft.analysisLastUpdated.delete(analysisId)
  draft.lastGlobalUpdate = Date.now()
}

const pruneAnalyses = (draft: Draft<FeedbackStatusStore>): void => {
  const now = Date.now()

  const staleAnalysisIds: string[] = []
  draft.analysisLastUpdated.forEach((lastUpdated, analysisId) => {
    const isSubscribed = draft.subscriptions.has(analysisId)
    const status = draft.subscriptionStatus.get(analysisId)
    if (isSubscribed || status === 'pending' || status === 'active') {
      return
    }
    if (now - lastUpdated > FEEDBACK_TTL_MS) {
      staleAnalysisIds.push(analysisId)
    }
  })

  staleAnalysisIds.forEach((analysisId) => {
    removeAnalysisFeedback(draft, analysisId)
    const retryState = draft.subscriptionRetries.get(analysisId)
    if (retryState?.timeoutId) {
      clearTimeout(retryState.timeoutId)
    }
    draft.subscriptionStatus.delete(analysisId)
    draft.subscriptionRetries.delete(analysisId)
  })

  const exceedsFeedbackLimit = draft.feedbacks.size > MAX_STORED_FEEDBACKS
  const exceedsAnalysisLimit = draft.feedbacksByAnalysisId.size > MAX_TRACKED_ANALYSES

  if (!exceedsFeedbackLimit && !exceedsAnalysisLimit) {
    return
  }

  const sortableAnalyses = Array.from(draft.analysisLastUpdated.entries())
    .filter(([analysisId]) => {
      const isSubscribed = draft.subscriptions.has(analysisId)
      const status = draft.subscriptionStatus.get(analysisId)
      return !isSubscribed && status !== 'pending' && status !== 'active'
    })
    .sort((a, b) => a[1] - b[1]) // oldest first

  for (const [analysisId] of sortableAnalyses) {
    if (
      draft.feedbacks.size <= MAX_STORED_FEEDBACKS &&
      draft.feedbacksByAnalysisId.size <= MAX_TRACKED_ANALYSES
    ) {
      break
    }

    removeAnalysisFeedback(draft, analysisId)
    const retryState = draft.subscriptionRetries.get(analysisId)
    if (retryState?.timeoutId) {
      clearTimeout(retryState.timeoutId)
    }
    draft.subscriptionStatus.delete(analysisId)
    draft.subscriptionRetries.delete(analysisId)
  }
}

export const useFeedbackStatusStore = create<FeedbackStatusStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        feedbacks: new Map(),
        feedbacksByAnalysisId: new Map(),
        analysisLastUpdated: new Map(),
        subscriptions: new Map(),
        subscriptionStatus: new Map(),
        subscriptionRetries: new Map(),
        backfilling: new Map(),
        backfillAbortControllers: new Map(),
        initialFetchAbortControllers: new Map(),
        backfillEventQueues: new Map(),
        diagnostics: new Map(),
        totalFeedbacks: 0,
        processingSSMLCount: 0,
        processingAudioCount: 0,
        completedCount: 0,
        failedCount: 0,
        lastGlobalUpdate: Date.now(),

        // Add feedback
        addFeedback: (feedback) => {
          set((draft) => {
            const feedbackState = createFeedbackState(feedback)
            draft.feedbacks.set(feedback.id, feedbackState)

            // Add to analysis mapping (dedupe in-place to avoid React key warnings)
            const existingIds = draft.feedbacksByAnalysisId.get(feedback.analysis_id)
            if (existingIds) {
              if (!existingIds.includes(feedback.id)) {
                existingIds.push(feedback.id)
              }
            } else {
              draft.feedbacksByAnalysisId.set(feedback.analysis_id, [feedback.id])
            }

            // Update counters
            draft.totalFeedbacks++
            if (feedback.ssml_status === 'processing') draft.processingSSMLCount++
            if (feedback.audio_status === 'processing' || feedback.audio_status === 'retrying') {
              draft.processingAudioCount++
            }
            if (feedback.ssml_status === 'completed' && feedback.audio_status === 'completed') {
              draft.completedCount++
            }
            if (feedback.ssml_status === 'failed' || feedback.audio_status === 'failed') {
              draft.failedCount++
            }

            markAnalysisTouched(draft, feedback.analysis_id)
            pruneAnalyses(draft)
            draft.lastGlobalUpdate = Date.now()
          })
        },

        // Update feedback
        updateFeedback: (feedbackId, updates) =>
          set((draft) => {
            const existing = draft.feedbacks.get(feedbackId)
            if (!existing) {
              log.warn(
                'FeedbackStatusStore',
                `Attempted to update non-existent feedback ${feedbackId}`
              )
              return
            }

            // Skip if both status fields are unchanged (true duplicate event)
            const newSSMLStatus = updates.ssml_status ?? existing.ssmlStatus
            const newAudioStatus = updates.audio_status ?? existing.audioStatus
            const newUpdatedAt = updates.updated_at ?? existing.updatedAt

            if (
              existing.ssmlStatus === newSSMLStatus &&
              existing.audioStatus === newAudioStatus &&
              existing.updatedAt === newUpdatedAt
            ) {
              if (__DEV__) {
                log.debug(
                  'FeedbackStatusStore',
                  `Skipping duplicate feedback update ${feedbackId}`,
                  {
                    ssmlStatus: newSSMLStatus,
                    audioStatus: newAudioStatus,
                  }
                )
              }
              return
            }

            // Compile-time stripping: DEBUG logs removed in production builds
            if (__DEV__) {
              log.debug('FeedbackStatusStore', `Updating feedback ${feedbackId}`, {
                existingAudioStatus: existing.audioStatus,
                existingSSMLStatus: existing.ssmlStatus,
                newAudioStatus: updates.audio_status,
                newSSMLStatus: updates.ssml_status,
                hasAudioUpdate: !!updates.audio_status,
                hasSSMLUpdate: !!updates.ssml_status,
              })
            }

            // Update counters based on status changes
            const oldSSMLStatus = existing.ssmlStatus
            const oldAudioStatus = existing.audioStatus

            // Update processing counts
            if (oldSSMLStatus === 'processing' && newSSMLStatus !== 'processing') {
              draft.processingSSMLCount--
            }
            if (oldSSMLStatus !== 'processing' && newSSMLStatus === 'processing') {
              draft.processingSSMLCount++
            }
            if (oldAudioStatus === 'processing' && newAudioStatus !== 'processing') {
              draft.processingAudioCount--
            }
            if (oldAudioStatus !== 'processing' && newAudioStatus === 'processing') {
              draft.processingAudioCount++
            }

            // Update completed/failed counts
            const wasCompleted = oldSSMLStatus === 'completed' && oldAudioStatus === 'completed'
            const isCompleted = newSSMLStatus === 'completed' && newAudioStatus === 'completed'
            const wasFailed = oldSSMLStatus === 'failed' || oldAudioStatus === 'failed'
            const isFailed = newSSMLStatus === 'failed' || newAudioStatus === 'failed'

            if (wasCompleted && !isCompleted) draft.completedCount--
            if (!wasCompleted && isCompleted) draft.completedCount++
            if (wasFailed && !isFailed) draft.failedCount--
            if (!wasFailed && isFailed) draft.failedCount++

            // Apply updates
            Object.assign(existing, {
              message: updates.message ?? existing.message,
              category: updates.category ?? existing.category,
              timestampSeconds: updates.timestamp_seconds ?? existing.timestampSeconds,
              confidence: updates.confidence ?? existing.confidence,
              ssmlStatus: newSSMLStatus,
              audioStatus: newAudioStatus,
              ssmlAttempts: updates.ssml_attempts ?? existing.ssmlAttempts,
              audioAttempts: updates.audio_attempts ?? existing.audioAttempts,
              ssmlLastError: updates.ssml_last_error ?? existing.ssmlLastError,
              audioLastError: updates.audio_last_error ?? existing.audioLastError,
              ssmlUpdatedAt: updates.ssml_updated_at ?? existing.ssmlUpdatedAt,
              audioUpdatedAt: updates.audio_updated_at ?? existing.audioUpdatedAt,
              updatedAt: newUpdatedAt,
              lastUpdated: Date.now(),
            })

            markAnalysisTouched(draft, existing.analysisId)
            pruneAnalyses(draft)
            draft.lastGlobalUpdate = Date.now()
          }),

        // Remove feedback
        removeFeedback: (feedbackId) =>
          set((draft) => {
            const existing = draft.feedbacks.get(feedbackId)
            if (!existing) return

            // Remove from analysis mapping
            const analysisIds = draft.feedbacksByAnalysisId.get(existing.analysisId)
            if (analysisIds) {
              const filtered = analysisIds.filter((id) => id !== feedbackId)
              if (filtered.length === 0) {
                draft.feedbacksByAnalysisId.delete(existing.analysisId)
              } else {
                draft.feedbacksByAnalysisId.set(existing.analysisId, filtered)
              }
            }

            // Update counters
            draft.totalFeedbacks = Math.max(0, draft.totalFeedbacks - 1)
            if (existing.ssmlStatus === 'processing') {
              draft.processingSSMLCount = Math.max(0, draft.processingSSMLCount - 1)
            }
            if (existing.audioStatus === 'processing' || existing.audioStatus === 'retrying') {
              draft.processingAudioCount = Math.max(0, draft.processingAudioCount - 1)
            }
            if (existing.ssmlStatus === 'completed' && existing.audioStatus === 'completed') {
              draft.completedCount = Math.max(0, draft.completedCount - 1)
            }
            if (existing.ssmlStatus === 'failed' || existing.audioStatus === 'failed') {
              draft.failedCount = Math.max(0, draft.failedCount - 1)
            }

            draft.feedbacks.delete(feedbackId)
            if (draft.feedbacksByAnalysisId.has(existing.analysisId)) {
              markAnalysisTouched(draft, existing.analysisId)
            } else {
              draft.analysisLastUpdated.delete(existing.analysisId)
            }

            pruneAnalyses(draft)
            draft.lastGlobalUpdate = Date.now()
          }),

        // Set SSML status
        setSSMLStatus: (feedbackId, status, error) => {
          get().updateFeedback(feedbackId, {
            ssml_status: status,
            ssml_attempts: status === 'failed' ? undefined : 0,
            ssml_last_error: error || null,
            ssml_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (error) {
            log.error('FeedbackStatusStore', `SSML status error for feedback ${feedbackId}`, {
              status,
              error,
            })
          }
        },

        // Set audio status
        setAudioStatus: (feedbackId, status, error) => {
          get().updateFeedback(feedbackId, {
            audio_status: status,
            audio_attempts: status === 'failed' ? undefined : 0,
            audio_last_error: error || null,
            audio_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (error) {
            log.error('FeedbackStatusStore', `Audio status error for feedback ${feedbackId}`, {
              status,
              error,
            })
          }
        },

        // Get feedbacks by analysis ID
        getFeedbacksByAnalysisId: (analysisId) => {
          const state = get()
          const feedbackIds = state.feedbacksByAnalysisId.get(analysisId) || []
          const result = feedbackIds
            .map((id) => state.feedbacks.get(id))
            .filter((feedback): feedback is FeedbackStatusState => feedback !== undefined)
            .sort((a, b) => a.timestampSeconds - b.timestampSeconds)

          return result
        },

        // Get feedback by ID
        getFeedbackById: (feedbackId) => {
          return get().feedbacks.get(feedbackId) || null
        },

        // Get processing feedbacks
        getProcessingFeedbacks: () => {
          const state = get()
          return Array.from(state.feedbacks.values()).filter(
            (feedback) =>
              feedback.ssmlStatus === 'processing' ||
              feedback.audioStatus === 'processing' ||
              feedback.audioStatus === 'retrying'
          )
        },

        // Subscribe to analysis feedbacks
        subscribeToAnalysisFeedbacks: async (analysisId) => {
          const state = get()
          const existingStatus = state.subscriptionStatus.get(analysisId)
          // FIX: Check status ALONE - the subscriptions Map is populated AFTER channel creation,
          // but status is set to 'pending' BEFORE. This caused a race window where duplicate
          // subscriptions could be created, causing Supabase to close the first channel.
          const shouldBlock = existingStatus === 'active' || existingStatus === 'pending'

          // FIX: Guard on status alone - don't require subscriptions.has()
          // Status is set to 'pending' immediately, subscriptions Map is set later
          if (shouldBlock) {
            log.debug(
              'FeedbackStatusStore',
              `Already subscribed or subscribing to analysis ${analysisId}`
            )
            return
          }

          if (state.subscriptionStatus.get(analysisId) === 'failed') {
            log.warn(
              'FeedbackStatusStore',
              `Skipping subscription for failed analysis ${analysisId}`
            )
            return
          }

          // FIX: Set status to 'pending' SYNCHRONOUSLY before any async work
          // This ensures any concurrent calls see the pending status immediately
          // and prevents duplicate channel creation race conditions
          set((draft) => {
            draft.subscriptionStatus.set(analysisId, 'pending')
            if (!draft.subscriptionRetries.has(analysisId)) {
              draft.subscriptionRetries.set(analysisId, { attempts: 0, timeoutId: null })
            }
          })

          // Record diagnostic: subscription created
          get().recordDiagnosticEvent(analysisId, 'subscription_created')

          try {
            // Check if feedbacks already exist in store (from prefetch or previous subscription)
            const existingFeedbacksInStore = get().getFeedbacksByAnalysisId(analysisId)
            const hasPrefetchedFeedbacks = existingFeedbacksInStore.length > 0

            let existingFeedbacks: any[] | null = null

            if (hasPrefetchedFeedbacks) {
              // Use prefetched feedbacks - skip database fetch for instant display
              existingFeedbacks = existingFeedbacksInStore.map((fb) => ({
                id: fb.id,
                analysis_id: fb.analysisId,
                message: fb.message,
                category: fb.category,
                timestamp_seconds: fb.timestampSeconds,
                confidence: fb.confidence,
                ssml_status: fb.ssmlStatus,
                audio_status: fb.audioStatus,
                ssml_attempts: fb.ssmlAttempts,
                audio_attempts: fb.audioAttempts,
                ssml_last_error: fb.ssmlLastError,
                audio_last_error: fb.audioLastError,
                ssml_updated_at: fb.ssmlUpdatedAt,
                audio_updated_at: fb.audioUpdatedAt,
                created_at: fb.createdAt,
                updated_at: fb.updatedAt,
              })) as any[]
            } else {
              // Fetch existing feedbacks from database
              // Create abort controller for initial fetch to allow cancellation on unmount
              const initialFetchAbortController = new AbortController()
              set((draft) => {
                draft.initialFetchAbortControllers.set(analysisId, initialFetchAbortController)
              })

              try {
                // Check if aborted before starting fetch
                if (initialFetchAbortController.signal.aborted) {
                  if (__DEV__) {
                    log.debug('FeedbackStatusStore', 'Initial fetch aborted before start', {
                      analysisId,
                    })
                  }
                  return
                }

                // Note: Using any type for now since analysis_feedback table may not be in current type definitions
                const { data: fetchedFeedbacks, error: fetchError } = await (supabase as any)
                  .from('analysis_feedback')
                  .select(
                    'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
                  )
                  .eq('analysis_id', analysisId)
                  .order('created_at', { ascending: true })
                  .abortSignal(initialFetchAbortController.signal)

                // Check if aborted after fetch completes
                if (initialFetchAbortController.signal.aborted) {
                  if (__DEV__) {
                    log.debug('FeedbackStatusStore', 'Initial fetch aborted after completion', {
                      analysisId,
                    })
                  }
                  return
                }

                if (fetchError) {
                  log.error('FeedbackStatusStore', 'Failed to fetch existing feedbacks', fetchError)
                  throw fetchError
                }

                existingFeedbacks = fetchedFeedbacks
              } finally {
                // Clean up abort controller after fetch completes
                set((draft) => {
                  draft.initialFetchAbortControllers.delete(analysisId)
                })
              }
            }

            // Add existing feedbacks to store (idempotent - deduplicates if already present)
            if (existingFeedbacks && existingFeedbacks.length > 0) {
              existingFeedbacks.forEach((feedback: any) => {
                get().addFeedback(feedback as FeedbackStatusData)
              })
            }

            // Set up real-time subscription
            const channel = supabase
              .channel(`analysis_feedback:${analysisId}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'analysis_feedback',
                  filter: `analysis_id=eq.${analysisId}`,
                },
                (payload: any) => {
                  // Queue subscription events during backfill to prevent race conditions
                  if (get().backfilling.get(analysisId)) {
                    log.debug(
                      'FeedbackStatusStore',
                      'Queueing subscription event during backfill',
                      {
                        analysisId,
                        event: payload.eventType,
                        feedbackId: payload.new?.id || payload.old?.id,
                      }
                    )
                    // Queue the event for processing after backfill completes
                    set((draft) => {
                      const queue = draft.backfillEventQueues.get(analysisId) || []
                      queue.push({ payload, timestamp: Date.now() })

                      // Limit queue size to prevent memory growth (FIFO: drop oldest events)
                      if (queue.length > 100) {
                        queue.shift() // Drop oldest event
                        log.warn(
                          'FeedbackStatusStore',
                          'Backfill event queue size limit reached, dropping oldest event',
                          {
                            analysisId,
                            queueSize: queue.length,
                          }
                        )
                      }

                      draft.backfillEventQueues.set(analysisId, queue)
                    })
                    return
                  }

                  // Process event immediately if not backfilling
                  processFeedbackEvent(payload, get)
                }
              )
              .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                  set((draft) => {
                    draft.subscriptionStatus.set(analysisId, 'active')
                    const retryState = draft.subscriptionRetries.get(analysisId)
                    if (retryState) {
                      if (retryState.timeoutId) {
                        clearTimeout(retryState.timeoutId)
                        retryState.timeoutId = null
                      }
                      retryState.attempts = 0
                    }
                  })

                  // Record diagnostic: subscription confirmed
                  get().recordDiagnosticEvent(analysisId, 'subscription_confirmed')

                  // Backfill check: Re-fetch after subscription confirms to catch missed inserts
                  // This handles the race condition where feedbacks are inserted between
                  // the initial fetch and subscription setup
                  // Set backfill flag to prevent subscription events during backfill
                  // Create abort controller for backfill fetch to allow cancellation
                  const backfillAbortController = new AbortController()
                  set((draft) => {
                    draft.backfilling.set(analysisId, true)
                    draft.backfillAbortControllers.set(analysisId, backfillAbortController)
                  })

                  log.info(
                    'FeedbackStatusStore',
                    'Starting backfill fetch after subscription confirmed',
                    {
                      analysisId,
                    }
                  )

                  try {
                    // Check if aborted before starting fetch
                    if (backfillAbortController.signal.aborted) {
                      log.debug('FeedbackStatusStore', 'Backfill fetch aborted before start', {
                        analysisId,
                      })
                      return
                    }

                    // Calculate cutoff timestamp: only fetch feedbacks created after the most recent one we have
                    // Use 1s buffer to catch feedbacks inserted between initial fetch and subscription setup
                    const existingFeedbacks = get().getFeedbacksByAnalysisId(analysisId)
                    const mostRecentTimestamp =
                      existingFeedbacks.length > 0
                        ? Math.max(...existingFeedbacks.map((f) => new Date(f.createdAt).getTime()))
                        : 0
                    const initialFetchTimestamp = Date.now() - 1000 // 1s buffer from now
                    const cutoffTimestamp = Math.max(mostRecentTimestamp, initialFetchTimestamp)

                    // Only fetch feedbacks created after the cutoff timestamp
                    const { data: missedFeedbacks, error: backfillError } = await (supabase as any)
                      .from('analysis_feedback')
                      .select(
                        'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
                      )
                      .eq('analysis_id', analysisId)
                      .gt('created_at', new Date(cutoffTimestamp).toISOString())
                      .order('created_at', { ascending: true })
                      .abortSignal(backfillAbortController.signal)

                    // Check if aborted after fetch completes
                    if (backfillAbortController.signal.aborted) {
                      log.debug('FeedbackStatusStore', 'Backfill fetch aborted after completion', {
                        analysisId,
                      })
                      return
                    }

                    if (backfillError) {
                      log.warn('FeedbackStatusStore', 'Backfill fetch failed', {
                        analysisId,
                        error: backfillError,
                      })
                    } else if (missedFeedbacks && missedFeedbacks.length > 0) {
                      log.info('FeedbackStatusStore', 'Backfill fetch found missed feedbacks', {
                        analysisId,
                        missedCount: missedFeedbacks.length,
                      })

                      // Add only missed feedbacks atomically using store action
                      // Check existingIds INSIDE atomic update to prevent TOCTOU race condition
                      set((draft) => {
                        // Read existing IDs from draft state (atomic - includes any queued events already processed)
                        const existingIdsInDraft = new Set(
                          (draft.feedbacksByAnalysisId.get(analysisId) || [])
                            .map((id) => draft.feedbacks.get(id)?.id)
                            .filter((id): id is number => id !== undefined)
                        )

                        let addedCount = 0
                        missedFeedbacks.forEach((feedback: any) => {
                          if (!existingIdsInDraft.has(feedback.id)) {
                            // Use store action, not direct get().addFeedback() to ensure atomicity
                            const feedbackState = createFeedbackState(
                              feedback as FeedbackStatusData
                            )
                            draft.feedbacks.set(feedback.id, feedbackState)

                            // Add to analysis mapping
                            const existingIdsForAnalysis = draft.feedbacksByAnalysisId.get(
                              feedback.analysis_id
                            )
                            if (existingIdsForAnalysis) {
                              if (!existingIdsForAnalysis.includes(feedback.id)) {
                                existingIdsForAnalysis.push(feedback.id)
                              }
                            } else {
                              draft.feedbacksByAnalysisId.set(feedback.analysis_id, [feedback.id])
                            }

                            // Update counters
                            if (feedbackState.ssmlStatus === 'processing') {
                              draft.processingSSMLCount += 1
                            }
                            if (
                              feedbackState.audioStatus === 'processing' ||
                              feedbackState.audioStatus === 'retrying'
                            ) {
                              draft.processingAudioCount += 1
                            }
                            if (
                              feedbackState.ssmlStatus === 'completed' &&
                              feedbackState.audioStatus === 'completed'
                            ) {
                              draft.completedCount += 1
                            }
                            if (
                              feedbackState.ssmlStatus === 'failed' ||
                              feedbackState.audioStatus === 'failed'
                            ) {
                              draft.failedCount += 1
                            }

                            draft.totalFeedbacks += 1
                            markAnalysisTouched(draft, feedback.analysis_id)
                            // Update set for next iteration to prevent duplicates in same batch
                            existingIdsInDraft.add(feedback.id)
                            addedCount++
                          }
                        })

                        if (addedCount > 0) {
                          log.info('FeedbackStatusStore', 'Backfill added missed feedbacks', {
                            analysisId,
                            addedCount,
                            totalFeedbacks: missedFeedbacks.length,
                          })
                        }
                      })
                    } else {
                      log.info(
                        'FeedbackStatusStore',
                        'Backfill fetch completed - no missed feedbacks',
                        {
                          analysisId,
                        }
                      )
                    }
                  } catch (error) {
                    // Ignore AbortError - it's expected when component unmounts
                    if (error instanceof Error && error.name === 'AbortError') {
                      log.debug('FeedbackStatusStore', 'Backfill fetch aborted', {
                        analysisId,
                      })
                      return
                    }

                    log.warn('FeedbackStatusStore', 'Backfill check error', {
                      analysisId,
                      error: error instanceof Error ? error.message : String(error),
                    })
                  } finally {
                    // Clear backfill flag and abort controller after backfill completes (success or failure)
                    set((draft) => {
                      draft.backfilling.delete(analysisId)
                      draft.backfillAbortControllers.delete(analysisId)
                    })

                    // Process queued events that arrived during backfill
                    const queuedEvents = get().backfillEventQueues.get(analysisId) || []
                    if (queuedEvents.length > 0) {
                      log.info('FeedbackStatusStore', 'Processing queued events after backfill', {
                        analysisId,
                        queuedCount: queuedEvents.length,
                      })

                      // Process events in order (oldest first)
                      queuedEvents.forEach(({ payload: queuedPayload }) => {
                        processFeedbackEvent(queuedPayload, get)
                      })

                      // Clear the queue
                      set((draft) => {
                        draft.backfillEventQueues.delete(analysisId)
                      })
                    }
                  }
                } else if (status === 'CHANNEL_ERROR') {
                  // CHANNEL_ERROR can happen during reconnection or cleanup - don't spam error logs
                  log.debug(
                    'FeedbackStatusStore',
                    `Subscription channel error for analysis ${analysisId}`
                  )
                  set((draft) => {
                    const retryState = draft.subscriptionRetries.get(analysisId)

                    if (retryState?.timeoutId) {
                      clearTimeout(retryState.timeoutId)
                      retryState.timeoutId = null
                    }

                    if (!retryState || retryState.attempts >= 3) {
                      draft.subscriptionStatus.set(analysisId, 'failed')
                      draft.subscriptions.get(analysisId)?.()
                      draft.subscriptions.delete(analysisId)
                      draft.subscriptionRetries.delete(analysisId)
                      log.warn('FeedbackStatusStore', 'Subscription marked failed after retries', {
                        analysisId,
                      })

                      // FINAL FETCH: Catch any feedbacks that arrived after last retry's initial fetch
                      // Fire and forget - don't block on this
                      void (async () => {
                        try {
                          const { data: finalFeedbacks, error } = await (supabase as any)
                            .from('analysis_feedback')
                            .select(
                              'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
                            )
                            .eq('analysis_id', analysisId)
                            .order('created_at', { ascending: true })

                          if (!error && finalFeedbacks && finalFeedbacks.length > 0) {
                            log.info(
                              'FeedbackStatusStore',
                              'Final fetch found feedbacks after retries failed',
                              {
                                analysisId,
                                count: finalFeedbacks.length,
                              }
                            )
                            finalFeedbacks.forEach((feedback: any) => {
                              get().addFeedback(feedback as FeedbackStatusData)
                            })
                          }
                        } catch (err) {
                          log.debug('FeedbackStatusStore', 'Final fetch failed (non-critical)', {
                            analysisId,
                            error: err instanceof Error ? err.message : String(err),
                          })
                        }
                      })()

                      return
                    }

                    retryState.attempts += 1
                    const delay = 500 * 2 ** (retryState.attempts - 1)
                    retryState.timeoutId = setTimeout(() => {
                      const latestState = get()
                      void latestState
                        .subscribeToAnalysisFeedbacks(analysisId)
                        .catch((err: unknown) => {
                          log.error('FeedbackStatusStore', 'retry subscribe failed', {
                            error: err,
                            analysisId,
                          })
                        })
                    }, delay)

                    draft.subscriptionRetries.set(analysisId, retryState)
                    draft.subscriptionStatus.set(analysisId, 'pending')
                  })
                }
              })

            // Store unsubscribe function for cleanup
            const unsubscribe = () => {
              log.info('FeedbackStatusStore', `Unsubscribing from analysis ${analysisId}`)
              channel.unsubscribe()
            }
            set((draft) => {
              draft.subscriptions.set(analysisId, unsubscribe)
            })
          } catch (error) {
            log.error('FeedbackStatusStore', 'failed to subscribe to analysis', {
              error,
              analysisId,
            })
            throw error
          }
        },

        // Unsubscribe from analysis
        unsubscribeFromAnalysis: (analysisId) =>
          set((draft) => {
            const unsubscribe = draft.subscriptions.get(analysisId)
            if (unsubscribe) {
              unsubscribe()
              draft.subscriptions.delete(analysisId)
            }
            const retryState = draft.subscriptionRetries.get(analysisId)
            if (retryState?.timeoutId) {
              clearTimeout(retryState.timeoutId)
            }
            draft.subscriptionRetries.delete(analysisId)
            draft.subscriptionStatus.delete(analysisId)
            draft.backfilling.delete(analysisId) // Clear backfill flag on unsubscribe
            draft.backfillEventQueues.delete(analysisId) // Clear event queue on unsubscribe

            // Abort any in-flight backfill fetch
            const backfillController = draft.backfillAbortControllers.get(analysisId)
            if (backfillController) {
              backfillController.abort()
              draft.backfillAbortControllers.delete(analysisId)
            }

            // Abort any in-flight initial fetch
            const initialFetchController = draft.initialFetchAbortControllers.get(analysisId)
            if (initialFetchController) {
              initialFetchController.abort()
              draft.initialFetchAbortControllers.delete(analysisId)
            }

            removeAnalysisFeedback(draft, analysisId)
          }),

        // Unsubscribe from all
        unsubscribeAll: () =>
          set((draft) => {
            draft.subscriptions.forEach((unsubscribe) => unsubscribe())
            draft.subscriptions.clear()
            draft.subscriptionStatus.clear()
            draft.subscriptionRetries.forEach((retryState) => {
              if (retryState.timeoutId) {
                clearTimeout(retryState.timeoutId)
              }
            })
            draft.subscriptionRetries.clear()
            draft.backfilling.clear() // Clear all backfill flags

            // Abort all in-flight backfill fetches
            draft.backfillAbortControllers.forEach((controller) => {
              controller.abort()
            })
            draft.backfillAbortControllers.clear()
            // Abort all in-flight initial fetches
            draft.initialFetchAbortControllers.forEach((controller) => {
              controller.abort()
            })
            draft.initialFetchAbortControllers.clear()
            draft.backfillEventQueues.clear() // Clear all event queues

            // Remove all feedback data to prevent unbounded growth
            draft.feedbacks.clear()
            draft.feedbacksByAnalysisId.clear()
            draft.analysisLastUpdated.clear()
            draft.totalFeedbacks = 0
            draft.processingSSMLCount = 0
            draft.processingAudioCount = 0
            draft.completedCount = 0
            draft.failedCount = 0
            draft.lastGlobalUpdate = Date.now()
          }),

        // Get statistics
        getStats: () => {
          const state = get()
          const feedbacks = Array.from(state.feedbacks.values())

          return {
            total: state.totalFeedbacks,
            ssmlQueued: feedbacks.filter((f) => f.ssmlStatus === 'queued').length,
            ssmlProcessing: feedbacks.filter((f) => f.ssmlStatus === 'processing').length,
            ssmlCompleted: feedbacks.filter((f) => f.ssmlStatus === 'completed').length,
            ssmlFailed: feedbacks.filter((f) => f.ssmlStatus === 'failed').length,
            audioQueued: feedbacks.filter((f) => f.audioStatus === 'queued').length,
            audioProcessing: feedbacks.filter((f) => f.audioStatus === 'processing').length,
            audioCompleted: feedbacks.filter((f) => f.audioStatus === 'completed').length,
            audioFailed: feedbacks.filter((f) => f.audioStatus === 'failed').length,
            maxSSMLAttempts: Math.max(0, ...feedbacks.map((f) => f.ssmlAttempts ?? 0)),
            maxAudioAttempts: Math.max(0, ...feedbacks.map((f) => f.audioAttempts ?? 0)),
          }
        },

        // Get diagnostics for debugging Realtime issues
        getDiagnostics: (analysisId: string) => {
          return get().diagnostics.get(analysisId) ?? null
        },

        // Record diagnostic event for debugging
        recordDiagnosticEvent: (
          analysisId: string,
          event:
            | 'subscription_created'
            | 'subscription_confirmed'
            | 'event_received'
            | 'staleness_poll'
            | 'staleness_update',
          details?: { eventType?: string; feedbackId?: number }
        ) =>
          set((draft) => {
            let diag = draft.diagnostics.get(analysisId)
            if (!diag) {
              diag = {
                subscriptionCreatedAt: null,
                subscriptionConfirmedAt: null,
                lastEventReceivedAt: null,
                eventsReceivedCount: 0,
                lastEventType: null,
                lastEventFeedbackId: null,
                stalenessPolls: 0,
                stalenessPollUpdates: 0,
              }
              draft.diagnostics.set(analysisId, diag)
            }

            const now = Date.now()
            switch (event) {
              case 'subscription_created':
                diag.subscriptionCreatedAt = now
                break
              case 'subscription_confirmed':
                diag.subscriptionConfirmedAt = now
                break
              case 'event_received':
                diag.lastEventReceivedAt = now
                diag.eventsReceivedCount++
                diag.lastEventType = details?.eventType ?? null
                diag.lastEventFeedbackId = details?.feedbackId ?? null
                break
              case 'staleness_poll':
                diag.stalenessPolls++
                break
              case 'staleness_update':
                diag.stalenessPollUpdates++
                break
            }
          }),

        // Reset store
        reset: () =>
          set((draft) => {
            // Unsubscribe from all subscriptions
            draft.subscriptions.forEach((unsubscribe) => unsubscribe())

            // Reset all state
            draft.feedbacks.clear()
            draft.feedbacksByAnalysisId.clear()
            draft.analysisLastUpdated.clear()
            draft.subscriptions.clear()
            draft.subscriptionStatus.clear()
            draft.subscriptionRetries.forEach((retryState) => {
              if (retryState.timeoutId) {
                clearTimeout(retryState.timeoutId)
              }
            })
            draft.subscriptionRetries.clear()
            draft.backfilling.clear() // Clear all backfill flags

            // Abort all in-flight backfill fetches
            draft.backfillAbortControllers.forEach((controller) => {
              controller.abort()
            })
            draft.backfillAbortControllers.clear()
            // Abort all in-flight initial fetches
            draft.initialFetchAbortControllers.forEach((controller) => {
              controller.abort()
            })
            draft.initialFetchAbortControllers.clear()
            draft.backfillEventQueues.clear() // Clear all event queues
            draft.diagnostics.clear() // Clear diagnostics

            draft.totalFeedbacks = 0
            draft.processingSSMLCount = 0
            draft.processingAudioCount = 0
            draft.completedCount = 0
            draft.failedCount = 0
            draft.lastGlobalUpdate = Date.now()
          }),
      })),
      {
        name: 'feedback-status-store',
        storage: createJSONStorage(() => mmkvStorage),
        // Serialize Maps to arrays for persistence, reconstruct on rehydration
        partialize: (state) => ({
          feedbacks: Array.from(state.feedbacks.entries()),
          feedbacksByAnalysisId: Array.from(state.feedbacksByAnalysisId.entries()),
          analysisLastUpdated: Array.from(state.analysisLastUpdated.entries()),
          totalFeedbacks: state.totalFeedbacks,
          processingSSMLCount: state.processingSSMLCount,
          processingAudioCount: state.processingAudioCount,
          completedCount: state.completedCount,
          failedCount: state.failedCount,
          lastGlobalUpdate: state.lastGlobalUpdate,
        }),
        // Reconstruct Maps from arrays on rehydration
        merge: (persistedState, currentState) => {
          const persisted = persistedState as {
            feedbacks?: [number, FeedbackStatusState][]
            feedbacksByAnalysisId?: [string, number[]][]
            analysisLastUpdated?: [string, number][]
            totalFeedbacks?: number
            processingSSMLCount?: number
            processingAudioCount?: number
            completedCount?: number
            failedCount?: number
            lastGlobalUpdate?: number
          }

          return {
            ...currentState,
            feedbacks: persisted.feedbacks ? new Map(persisted.feedbacks) : currentState.feedbacks,
            feedbacksByAnalysisId: persisted.feedbacksByAnalysisId
              ? new Map(persisted.feedbacksByAnalysisId)
              : currentState.feedbacksByAnalysisId,
            analysisLastUpdated: persisted.analysisLastUpdated
              ? new Map(persisted.analysisLastUpdated)
              : currentState.analysisLastUpdated,
            totalFeedbacks: persisted.totalFeedbacks ?? currentState.totalFeedbacks,
            processingSSMLCount: persisted.processingSSMLCount ?? currentState.processingSSMLCount,
            processingAudioCount:
              persisted.processingAudioCount ?? currentState.processingAudioCount,
            completedCount: persisted.completedCount ?? currentState.completedCount,
            failedCount: persisted.failedCount ?? currentState.failedCount,
            lastGlobalUpdate: persisted.lastGlobalUpdate ?? currentState.lastGlobalUpdate,
            // Transient state (subscriptions, abort controllers, etc.) should NOT persist
            subscriptions: currentState.subscriptions,
            subscriptionStatus: currentState.subscriptionStatus,
            subscriptionRetries: currentState.subscriptionRetries,
            backfilling: currentState.backfilling,
            backfillAbortControllers: currentState.backfillAbortControllers,
            initialFetchAbortControllers: currentState.initialFetchAbortControllers,
            backfillEventQueues: currentState.backfillEventQueues,
          }
        },
      }
    )
  )
)

// Selectors for common state combinations
export const useFeedbackStatusSelectors = () => {
  const store = useFeedbackStatusStore()

  return {
    // Processing state
    isProcessingAny: store.processingSSMLCount > 0 || store.processingAudioCount > 0,
    hasProcessingSSML: store.processingSSMLCount > 0,
    hasProcessingAudio: store.processingAudioCount > 0,
    hasCompletedFeedbacks: store.completedCount > 0,
    hasFailedFeedbacks: store.failedCount > 0,

    // Counts
    totalFeedbacks: store.totalFeedbacks,
    processingSSMLCount: store.processingSSMLCount,
    processingAudioCount: store.processingAudioCount,
    completedCount: store.completedCount,
    failedCount: store.failedCount,

    // Statistics
    stats: store.getStats(),

    // Active subscriptions
    activeSubscriptions: store.subscriptions.size,
    subscriptionStatus: store.subscriptionStatus,
    subscriptionRetries: store.subscriptionRetries,
  }
}

// Hook for monitoring feedbacks by analysis ID
export const useFeedbacksByAnalysisId = (analysisId: string) => {
  const getFeedbacksByAnalysisId = useFeedbackStatusStore((state) => state.getFeedbacksByAnalysisId)
  const subscribeToAnalysisFeedbacks = useFeedbackStatusStore(
    (state) => state.subscribeToAnalysisFeedbacks
  )
  const unsubscribeFromAnalysis = useFeedbackStatusStore((state) => state.unsubscribeFromAnalysis)
  const isSubscribed = useFeedbackStatusStore((state) => state.subscriptions.has(analysisId))

  // Auto-subscribe when hook is used
  React.useEffect(() => {
    if (!isSubscribed && analysisId) {
      subscribeToAnalysisFeedbacks(analysisId).catch((error) => {
        log.error(
          'useFeedbacksByAnalysisId',
          `Failed to subscribe to analysis ${analysisId}`,
          error
        )
      })
    }

    return () => {
      if (analysisId && isSubscribed) {
        unsubscribeFromAnalysis(analysisId)
      }
    }
  }, [analysisId, isSubscribed, subscribeToAnalysisFeedbacks, unsubscribeFromAnalysis])

  return {
    feedbacks: getFeedbacksByAnalysisId(analysisId),
    isSubscribed,
  }
}

// Hook for monitoring specific feedback
export const useFeedbackStatus = (feedbackId: number) => {
  const feedback = useFeedbackStatusStore((state) => state.feedbacks.get(feedbackId))

  return {
    feedback,
    exists: !!feedback,
    isSSMLQueued: feedback?.ssmlStatus === 'queued',
    isSSMLProcessing: feedback?.ssmlStatus === 'processing',
    isSSMLCompleted: feedback?.ssmlStatus === 'completed',
    isSSMLFailed: feedback?.ssmlStatus === 'failed',
    isAudioQueued: feedback?.audioStatus === 'queued',
    isAudioProcessing: feedback?.audioStatus === 'processing',
    isAudioRetrying: feedback?.audioStatus === 'retrying',
    isAudioCompleted: feedback?.audioStatus === 'completed',
    isAudioFailed: feedback?.audioStatus === 'failed',
    isFullyCompleted: feedback?.ssmlStatus === 'completed' && feedback?.audioStatus === 'completed',
    hasAnyFailure: feedback?.ssmlStatus === 'failed' || feedback?.audioStatus === 'failed',
    ssmlAttempts: feedback?.ssmlAttempts ?? 0,
    audioAttempts: feedback?.audioAttempts ?? 0,
    ssmlLastError: feedback?.ssmlLastError ?? null,
    audioLastError: feedback?.audioLastError ?? null,
    ssmlUpdatedAt: feedback?.ssmlUpdatedAt,
    audioUpdatedAt: feedback?.audioUpdatedAt,
    lastUpdated: feedback?.lastUpdated,
  }
}
