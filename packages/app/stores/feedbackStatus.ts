import { supabase } from '@my/api'
import { log } from '@my/logging'
import React from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Types for feedback status tracking
export type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed'

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

export interface FeedbackStatusStore {
  // Feedback tracking
  feedbacks: Map<number, FeedbackStatusState>
  feedbacksByAnalysisId: Map<string, number[]> // analysisId -> feedbackIds[]

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

  // Cleanup
  reset: () => void
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

export const useFeedbackStatusStore = create<FeedbackStatusStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      feedbacks: new Map(),
      feedbacksByAnalysisId: new Map(),
      subscriptions: new Map(),
      subscriptionStatus: new Map(),
      subscriptionRetries: new Map(),
      totalFeedbacks: 0,
      processingSSMLCount: 0,
      processingAudioCount: 0,
      completedCount: 0,
      failedCount: 0,
      lastGlobalUpdate: Date.now(),

      // Add feedback
      addFeedback: (feedback) =>
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
          if (feedback.audio_status === 'processing') draft.processingAudioCount++
          if (feedback.ssml_status === 'completed' && feedback.audio_status === 'completed') {
            draft.completedCount++
          }
          if (feedback.ssml_status === 'failed' || feedback.audio_status === 'failed') {
            draft.failedCount++
          }

          draft.lastGlobalUpdate = Date.now()
        }),

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

          log.debug('FeedbackStatusStore', `Updating feedback ${feedbackId}`, {
            existingAudioStatus: existing.audioStatus,
            existingSSMLStatus: existing.ssmlStatus,
            newAudioStatus: updates.audio_status,
            newSSMLStatus: updates.ssml_status,
            hasAudioUpdate: !!updates.audio_status,
            hasSSMLUpdate: !!updates.ssml_status,
          })

          // Update counters based on status changes
          const oldSSMLStatus = existing.ssmlStatus
          const oldAudioStatus = existing.audioStatus
          const newSSMLStatus = updates.ssml_status || oldSSMLStatus
          const newAudioStatus = updates.audio_status || oldAudioStatus

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
            updatedAt: updates.updated_at ?? existing.updatedAt,
            lastUpdated: Date.now(),
          })

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
          draft.totalFeedbacks--
          if (existing.ssmlStatus === 'processing') draft.processingSSMLCount--
          if (existing.audioStatus === 'processing') draft.processingAudioCount--
          if (existing.ssmlStatus === 'completed' && existing.audioStatus === 'completed') {
            draft.completedCount--
          }
          if (existing.ssmlStatus === 'failed' || existing.audioStatus === 'failed') {
            draft.failedCount--
          }

          draft.feedbacks.delete(feedbackId)
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
        return feedbackIds
          .map((id) => state.feedbacks.get(id))
          .filter((feedback): feedback is FeedbackStatusState => feedback !== undefined)
          .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
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
            feedback.ssmlStatus === 'processing' || feedback.audioStatus === 'processing'
        )
      },

      // Subscribe to analysis feedbacks
      subscribeToAnalysisFeedbacks: async (analysisId) => {
        const state = get()

        log.debug('FeedbackStatusStore', 'subscribeToAnalysisFeedbacks called', {
          analysisId,
          hasSubscription: state.subscriptions.has(analysisId),
          subscriptionStatus: state.subscriptionStatus.get(analysisId),
        })

        // Strengthen guard: don't subscribe if already active OR pending
        if (
          state.subscriptions.has(analysisId) &&
          (state.subscriptionStatus.get(analysisId) === 'active' ||
            state.subscriptionStatus.get(analysisId) === 'pending')
        ) {
          log.debug(
            'FeedbackStatusStore',
            `Already subscribed or subscribing to analysis ${analysisId}`
          )
          return
        }

        if (state.subscriptionStatus.get(analysisId) === 'failed') {
          log.warn('FeedbackStatusStore', `Skipping subscription for failed analysis ${analysisId}`)
          return
        }

        try {
          log.info('FeedbackStatusStore', `Subscribing to feedbacks for analysis ${analysisId}`)

          set((draft) => {
            draft.subscriptionStatus.set(analysisId, 'pending')
            if (!draft.subscriptionRetries.has(analysisId)) {
              draft.subscriptionRetries.set(analysisId, { attempts: 0, timeoutId: null })
            }
          })

          // First, fetch existing feedbacks
          // Note: Using any type for now since analysis_feedback table may not be in current type definitions
          const { data: existingFeedbacks, error: fetchError } = await (supabase as any)
            .from('analysis_feedback')
            .select(
              'id, analysis_id, message, category, timestamp_seconds, confidence, ssml_status, audio_status, ssml_attempts, audio_attempts, ssml_last_error, audio_last_error, ssml_updated_at, audio_updated_at, created_at'
            )
            .eq('analysis_id', analysisId)
            .order('created_at', { ascending: true })

          if (fetchError) {
            log.error('FeedbackStatusStore', 'Failed to fetch existing feedbacks', fetchError)
            throw fetchError
          }

          // Add existing feedbacks to store
          if (existingFeedbacks) {
            existingFeedbacks.forEach((feedback: any) => {
              get().addFeedback(feedback as FeedbackStatusData)
            })
          }

          // Set up real-time subscription
          const subscription = supabase
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
                const feedbackId = payload.new?.id || payload.old?.id
                log.info('FeedbackStatusStore', 'Received feedback update', {
                  event: payload.eventType,
                  feedbackId,
                  newAudioStatus: payload.new?.audio_status,
                  newSSMLStatus: payload.new?.ssml_status,
                  oldAudioStatus: payload.old?.audio_status,
                  oldSSMLStatus: payload.old?.ssml_status,
                  hasNewData: !!payload.new,
                  hasOldData: !!payload.old,
                })

                switch (payload.eventType) {
                  case 'INSERT':
                    if (payload.new) {
                      get().addFeedback(payload.new as FeedbackStatusData)
                    }
                    break
                  case 'UPDATE':
                    if (payload.new) {
                      get().updateFeedback(
                        payload.new.id,
                        payload.new as Partial<FeedbackStatusData>
                      )
                    }
                    break
                  case 'DELETE':
                    if (payload.old) {
                      get().removeFeedback(payload.old.id)
                    }
                    break
                }
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                log.info('FeedbackStatusStore', `Successfully subscribed to analysis ${analysisId}`)
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
              } else if (status === 'CHANNEL_ERROR') {
                log.error('FeedbackStatusStore', `Subscription error for analysis ${analysisId}`)
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
                    return
                  }

                  retryState.attempts += 1
                  const delay = 500 * 2 ** (retryState.attempts - 1)
                  retryState.timeoutId = setTimeout(() => {
                    const latestState = get()
                    void latestState
                      .subscribeToAnalysisFeedbacks(analysisId)
                      .catch((err: unknown) => {
                        log.error(
                          'FeedbackStatusStore',
                          `Retry subscribe failed for analysis ${analysisId}`,
                          err
                        )
                      })
                  }, delay)

                  draft.subscriptionRetries.set(analysisId, retryState)
                  draft.subscriptionStatus.set(analysisId, 'pending')
                })
              }
            })

          // Store unsubscribe function
          set((draft) => {
            draft.subscriptions.set(analysisId, () => {
              log.info('FeedbackStatusStore', `Unsubscribing from analysis ${analysisId}`)
              subscription.unsubscribe()
            })
          })
        } catch (error) {
          log.error('FeedbackStatusStore', `Failed to subscribe to analysis ${analysisId}`, error)
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
            draft.subscriptionStatus.delete(analysisId)
            const retryState = draft.subscriptionRetries.get(analysisId)
            if (retryState?.timeoutId) {
              clearTimeout(retryState.timeoutId)
            }
            draft.subscriptionRetries.delete(analysisId)
          }
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

      // Reset store
      reset: () =>
        set((draft) => {
          // Unsubscribe from all subscriptions
          draft.subscriptions.forEach((unsubscribe) => unsubscribe())

          // Reset all state
          draft.feedbacks.clear()
          draft.feedbacksByAnalysisId.clear()
          draft.subscriptions.clear()
          draft.totalFeedbacks = 0
          draft.processingSSMLCount = 0
          draft.processingAudioCount = 0
          draft.completedCount = 0
          draft.failedCount = 0
          draft.lastGlobalUpdate = Date.now()
        }),
    }))
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
  }, [analysisId, isSubscribed, subscribeToAnalysisFeedbacks])

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
