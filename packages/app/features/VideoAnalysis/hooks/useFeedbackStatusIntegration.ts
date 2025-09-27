import { useFeedbackStatusStore, useFeedbacksByAnalysisId } from '@app/stores/feedbackStatus'
import { log } from '@my/logging'
import { useEffect, useMemo } from 'react'

/**
 * Hook to integrate feedback status tracking with VideoAnalysis components
 * Automatically subscribes to feedback status updates for a given analysis
 */
export function useFeedbackStatusIntegration(analysisId?: string) {
  const { feedbacks, isSubscribed } = useFeedbacksByAnalysisId(analysisId || '')
  const store = useFeedbackStatusStore()

  // Log subscription status changes
  useEffect(() => {
    if (analysisId && isSubscribed) {
      log.info('useFeedbackStatusIntegration', `Subscribed to feedbacks for analysis ${analysisId}`)
    }
  }, [analysisId, isSubscribed])

  // Transform feedback data for UI components
  const feedbackItems = useMemo(() => {
    return feedbacks.map((feedback) => ({
      id: feedback.id.toString(),
      timestamp: feedback.timestampSeconds * 1000, // Convert to milliseconds for UI
      text: feedback.message,
      type: 'suggestion' as const, // Default type, could be enhanced based on category
      category: feedback.category as 'voice' | 'posture' | 'grip' | 'movement',
      ssmlStatus: feedback.ssmlStatus,
      audioStatus: feedback.audioStatus,
      confidence: feedback.confidence,
    }))
  }, [feedbacks])

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
    return store.getFeedbackById(numericId)
  }

  const retryFailedFeedback = (feedbackId: string) => {
    const numericId = Number.parseInt(feedbackId, 10)
    const feedback = store.getFeedbackById(numericId)

    if (!feedback) {
      log.warn('useFeedbackStatusIntegration', `Feedback ${feedbackId} not found for retry`)
      return
    }

    // Reset failed statuses to queued for retry
    if (feedback.ssmlStatus === 'failed') {
      store.setSSMLStatus(numericId, 'queued')
      log.info('useFeedbackStatusIntegration', `Retrying SSML for feedback ${feedbackId}`)
    }

    if (feedback.audioStatus === 'failed') {
      store.setAudioStatus(numericId, 'queued')
      log.info('useFeedbackStatusIntegration', `Retrying audio for feedback ${feedbackId}`)
    }
  }

  const cleanup = () => {
    if (analysisId) {
      store.unsubscribeFromAnalysis(analysisId)
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

    // Store access for advanced usage
    store,
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
