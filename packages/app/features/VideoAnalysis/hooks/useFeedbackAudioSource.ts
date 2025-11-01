import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getFirstAudioUrlForFeedback } from '@my/api'
import { log } from '@my/logging'

type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface FeedbackAudioItem {
  id: string
  timestamp: number
  audioStatus?: FeedbackProcessingStatus
}

export interface FeedbackAudioSourceState {
  audioUrls: Record<string, string>
  activeAudio: { id: string; url: string } | null
  errors: Record<string, string>
  selectAudio: (feedbackId: string) => void
  clearActiveAudio: () => void
  clearError: (feedbackId: string) => void
}

const CONTEXT = 'useFeedbackAudioSource'

export function useFeedbackAudioSource(
  feedbackItems: FeedbackAudioItem[]
): FeedbackAudioSourceState {
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [activeAudio, setActiveAudio] = useState<{ id: string; url: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // log.debug(CONTEXT, 'useFeedbackAudioSource: Processing feedback items', {
    //   totalItems: feedbackItems.length,
    //   itemsByStatus: feedbackItems.reduce(
    //     (acc, item) => {
    //       const status = item.audioStatus || 'undefined'
    //       acc[status] = (acc[status] || 0) + 1
    //       return acc
    //     },
    //     {} as Record<string, number>
    //   ),
    //   itemDetails: feedbackItems.map((item) => ({
    //     id: item.id,
    //     audioStatus: item.audioStatus,
    //     timestamp: item.timestamp,
    //   })),
    // })

    feedbackItems.forEach((item) => {
      if (!item || item.audioStatus !== 'completed') {
        // log.debug(CONTEXT, 'useFeedbackAudioSource: Skipping item (not completed)', {
        //   feedbackId: item.id,
        //   audioStatus: item.audioStatus,
        // })
        return
      }

      const feedbackId = item.id
      if (!feedbackId) {
        return
      }

      if (audioUrls[feedbackId] || inFlightRef.current.has(feedbackId)) {
        return
      }

      // Handle both numeric and string feedback IDs
      const numericId = Number.parseInt(feedbackId, 10)
      if (Number.isNaN(numericId)) {
        // For non-numeric IDs (like mock data), skip audio fetch silently
        // This is expected behavior for mock/seed data
        // log.debug(CONTEXT, 'Skipping audio fetch for non-numeric feedback id (likely mock data)', {
        //   feedbackId,
        // })
        return
      }

      inFlightRef.current.add(feedbackId)

      void getFirstAudioUrlForFeedback(numericId)
        .then((result) => {
          if (result.ok) {
            setAudioUrls((prev) => {
              if (prev[feedbackId]) {
                return prev
              }

              const next = { ...prev, [feedbackId]: result.url }
              return next
            })

            setErrors((prev) => {
              if (!prev[feedbackId]) {
                return prev
              }
              const next = { ...prev }
              delete next[feedbackId]
              return next
            })

            setActiveAudio((prev) => prev ?? { id: feedbackId, url: result.url })

            // log.info(CONTEXT, 'Audio url resolved for feedback', {
            //   feedbackId,
            // })
          } else {
            setErrors((prev) => ({ ...prev, [feedbackId]: result.error }))
            log.error(CONTEXT, 'Audio url fetch failed', {
              feedbackId,
              error: result.error,
            })
          }
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Unknown error'
          setErrors((prev) => ({ ...prev, [feedbackId]: message }))
          log.error(CONTEXT, 'Audio url fetch threw unexpected error', {
            feedbackId,
            error: message,
          })
        })
        .finally(() => {
          inFlightRef.current.delete(feedbackId)
        })
    })
  }, [audioUrls, errors, feedbackItems])

  // Use ref to access activeAudio without including it in callback deps
  // This prevents selectAudio/clearActiveAudio from changing when activeAudio changes
  const activeAudioRef = useRef(activeAudio)
  activeAudioRef.current = activeAudio

  // Store audioUrls in ref to prevent selectAudio from recreating when object reference changes
  // Only the actual URL values matter, not the object identity
  const audioUrlsRef = useRef(audioUrls)
  audioUrlsRef.current = audioUrls

  const selectAudio = useCallback(
    (feedbackId: string) => {
      const url = audioUrlsRef.current[feedbackId]
      if (!url) {
        log.warn(CONTEXT, 'Attempted to select feedback audio without cached url', {
          feedbackId,
          availableUrls: Object.keys(audioUrlsRef.current),
        })
        return
      }

      // If selecting the same audio id again, append a cache-busting fragment to force controller reset
      const urlToUse =
        activeAudioRef.current?.id === feedbackId ? `${url}#replay=${Date.now()}` : url

      // log.info(CONTEXT, 'Selecting audio for feedback', {
      //   feedbackId,
      //   url: urlToUse.substring(0, 50) + '...',
      //   previousActiveId: activeAudioRef.current?.id,
      // })
      setActiveAudio({ id: feedbackId, url: urlToUse })
    },
    [] // Empty deps - uses refs for all dynamic values
  )

  const clearActiveAudio = useCallback(() => {
    // log.info(CONTEXT, 'Clearing active audio', {
    //   previousActiveId: activeAudioRef.current?.id,
    // })
    setActiveAudio(null)
  }, [])

  const clearError = useCallback((feedbackId: string) => {
    // log.info(CONTEXT, 'Clearing error for feedback', { feedbackId })
    setErrors((prev) => {
      if (!prev[feedbackId]) {
        return prev
      }

      const next = { ...prev }
      delete next[feedbackId]
      return next
    })
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  return useMemo(
    () => ({
      audioUrls,
      activeAudio,
      errors,
      selectAudio,
      clearActiveAudio,
      clearError,
    }),
    [audioUrls, activeAudio, errors, selectAudio, clearActiveAudio, clearError]
  )
}
