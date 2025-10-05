import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface BubbleControllerState {
  currentBubbleIndex: number | null
  bubbleVisible: boolean
  showBubble: (index: number) => void
  hideBubble: () => void
  checkAndShowBubbleAtTime: (currentTimeMs: number) => number | null
}

export interface BubbleControllerOptions<TItem extends BubbleFeedbackItem> {
  onBubbleShow?: (args: {
    index: number
    item: TItem
    displayDurationMs: number
  }) => void
  onBubbleHide?: (args: { index: number | null; item: TItem | null }) => void
}

export interface BubbleFeedbackItem {
  id: string
  timestamp: number
}

const MIN_DISPLAY_DURATION_MS = 3000
const TIMESTAMP_THRESHOLD_MS = 500
const PAUSE_RECENT_WINDOW_MS = 2500
const PAUSE_HIDE_DELAY_MS = 100
const CHECK_THROTTLE_MS = 50

export function useBubbleController<TItem extends BubbleFeedbackItem>(
  feedbackItems: TItem[],
  currentTime: number,
  isPlaying: boolean,
  audioUrls: Record<string, string>,
  audioDuration: number,
  options: BubbleControllerOptions<TItem> = {}
): BubbleControllerState {
  const [currentBubbleIndex, setCurrentBubbleIndex] = useState<number | null>(null)
  const [bubbleVisible, setBubbleVisible] = useState(false)

  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBubbleShowTimeRef = useRef<number>(0)
  const lastCheckTimestampRef = useRef<number | null>(null)
  const feedbackItemsRef = useRef(feedbackItems)

  useEffect(() => {
    feedbackItemsRef.current = feedbackItems
  }, [feedbackItems])

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Track latest current time for debugging purposes
    lastCheckTimestampRef.current = Math.max(
      lastCheckTimestampRef.current ?? currentTime * 1000,
      currentTime * 1000
    )
  }, [currentTime])

  const hideBubble = useCallback(() => {
    log.info('useBubbleController', 'hideBubble invoked')

    setBubbleVisible(false)

    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = null
    }

    setCurrentBubbleIndex((prev) => {
      const currentItem = prev !== null ? (feedbackItemsRef.current[prev] ?? null) : null
      options.onBubbleHide?.({ index: prev, item: currentItem })
      return null
    })
  }, [options])

  const showBubble = useCallback(
    (index: number) => {
      const item = feedbackItemsRef.current[index]

      if (!item) {
        log.warn('useBubbleController', 'Attempted to show bubble with invalid index', {
          index,
          feedbackCount: feedbackItemsRef.current.length,
        })
        return
      }

      log.info('useBubbleController', 'showBubble invoked', {
        index,
        itemId: item.id,
        timestamp: item.timestamp,
      })

      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = null
      }

      setCurrentBubbleIndex(index)
      setBubbleVisible(true)
      lastBubbleShowTimeRef.current = Date.now()

      const hasAudioUrl = Boolean(audioUrls[item.id])
      const displayDurationMs =
        hasAudioUrl && audioDuration > 0
          ? Math.max(MIN_DISPLAY_DURATION_MS, audioDuration * 1000)
          : MIN_DISPLAY_DURATION_MS

      bubbleTimerRef.current = setTimeout(() => {
        hideBubble()
      }, displayDurationMs)

      options.onBubbleShow?.({ index, item, displayDurationMs })
    },
    [audioDuration, audioUrls, hideBubble, options]
  )

  useEffect(() => {
    if (!isPlaying && bubbleVisible) {
      const timeSinceLastShow = Date.now() - lastBubbleShowTimeRef.current
      const recentlyShown = timeSinceLastShow < PAUSE_RECENT_WINDOW_MS

      log.info('useBubbleController', 'pause detection triggered', {
        isPlaying,
        bubbleVisible,
        timeSinceLastShow,
        recentlyShown,
      })

      let timer: ReturnType<typeof setTimeout> | null = null

      if (!recentlyShown) {
        timer = setTimeout(() => {
          if (!isPlaying && bubbleVisible) {
            log.info('useBubbleController', 'Hiding bubble due to pause (older than threshold)')
            hideBubble()
          }
        }, PAUSE_HIDE_DELAY_MS)
      }

      return () => {
        if (timer) {
          clearTimeout(timer)
        }
      }
    }

    return undefined
  }, [bubbleVisible, hideBubble, isPlaying])

  const checkAndShowBubbleAtTime = useCallback(
    (currentTimeMs: number) => {
      const lastCheck = lastCheckTimestampRef.current
      if (lastCheck !== null && Math.abs(currentTimeMs - lastCheck) < CHECK_THROTTLE_MS) {
        return null
      }

      lastCheckTimestampRef.current = currentTimeMs

      for (let index = 0; index < feedbackItemsRef.current.length; index += 1) {
        const item = feedbackItemsRef.current[index]
        const timeDiff = Math.abs(currentTimeMs - item.timestamp)
        const isNearTimestamp = timeDiff < TIMESTAMP_THRESHOLD_MS
        const canShow = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

        log.info('useBubbleController', 'checking bubble trigger', {
          index,
          itemId: item.id,
          itemTimestamp: item.timestamp,
          currentTimeMs,
          timeDiff,
          isNearTimestamp,
          bubbleVisible,
          currentBubbleIndex,
          canShow,
        })

        if (canShow) {
          showBubble(index)
          return index
        }
      }

      return null
    },
    [bubbleVisible, currentBubbleIndex, showBubble]
  )

  return {
    currentBubbleIndex,
    bubbleVisible,
    showBubble,
    hideBubble,
    checkAndShowBubbleAtTime,
  }
}
