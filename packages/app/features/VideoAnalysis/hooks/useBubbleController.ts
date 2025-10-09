import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

export type BubbleTimerReason = 'initial' | 'playback-start' | 'duration-update'
export type BubbleHideReason =
  | 'manual'
  | 'timer-elapsed'
  | 'playback-paused'
  | 'cleanup'
  | 'audio-stop'

export interface BubbleControllerState {
  currentBubbleIndex: number | null
  bubbleVisible: boolean
  showBubble: (index: number) => void
  hideBubble: (reason?: BubbleHideReason) => void
  checkAndShowBubbleAtTime: (currentTimeMs: number) => number | null
}

export interface BubbleControllerOptions<TItem extends BubbleFeedbackItem> {
  onBubbleShow?: (args: {
    index: number
    item: TItem
    displayDurationMs: number
  }) => void
  onBubbleHide?: (args: {
    index: number | null
    item: TItem | null
    reason: BubbleHideReason
  }) => void
  onBubbleTimerUpdate?: (args: {
    index: number
    item: TItem
    displayDurationMs: number
    reason: BubbleTimerReason
  }) => void
  onBubbleTimerElapsed?: (args: {
    index: number
    item: TItem
    displayDurationMs: number
    reason: BubbleTimerReason
  }) => boolean | void
}

export interface BubbleFeedbackItem {
  id: string
  timestamp: number
}

const MIN_DISPLAY_DURATION_MS = 3000
const TIMESTAMP_THRESHOLD_MS = 500
const CHECK_THROTTLE_MS = 50

type BubbleTimerState<TItem extends BubbleFeedbackItem> = {
  item: TItem | null
  index: number | null
  totalDurationMs: number
  startedAtMs: number | null
  waitingForPlayback: boolean
  expiryReason: BubbleTimerReason | null
}

const defaultTimerState: BubbleTimerState<BubbleFeedbackItem> = {
  item: null,
  index: null,
  totalDurationMs: MIN_DISPLAY_DURATION_MS,
  startedAtMs: null,
  waitingForPlayback: false,
  expiryReason: null,
}

const calculateDisplayDuration = (hasAudioUrl: boolean, audioDurationSeconds: number) => {
  if (!hasAudioUrl) {
    return MIN_DISPLAY_DURATION_MS
  }

  if (audioDurationSeconds > 0) {
    return audioDurationSeconds * 1000
  }

  return 0
}

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
  const timerStateRef = useRef<BubbleTimerState<TItem>>({
    ...defaultTimerState,
  } as BubbleTimerState<TItem>)

  useEffect(() => {
    feedbackItemsRef.current = feedbackItems
  }, [feedbackItems])

  const clearBubbleTimer = useCallback(() => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = null
    }
  }, [])

  const resetTimerState = useCallback(() => {
    timerStateRef.current = {
      ...defaultTimerState,
    } as BubbleTimerState<TItem>
  }, [])

  useEffect(() => {
    return () => {
      clearBubbleTimer()
    }
  }, [clearBubbleTimer])

  useEffect(() => {
    lastCheckTimestampRef.current = Math.max(
      lastCheckTimestampRef.current ?? currentTime * 1000,
      currentTime * 1000
    )
  }, [currentTime])

  const hideBubble = useCallback(
    (reason: BubbleHideReason = 'manual') => {
      log.info('useBubbleController', 'hideBubble invoked', { reason })

      setBubbleVisible(false)
      clearBubbleTimer()
      resetTimerState()

      setCurrentBubbleIndex((prev) => {
        const currentItem = prev !== null ? (feedbackItemsRef.current[prev] ?? null) : null
        options.onBubbleHide?.({ index: prev, item: currentItem, reason })
        return null
      })
    },
    [clearBubbleTimer, options, resetTimerState]
  )

  const scheduleBubbleHide = useCallback(
    (params: { index: number; item: TItem; reason: BubbleTimerReason }) => {
      const { index, item, reason } = params
      const now = Date.now()
      const currentState = timerStateRef.current
      const startedAt = currentState.startedAtMs ?? now
      const totalDurationMs = currentState.totalDurationMs
      const elapsed = currentState.startedAtMs ? Math.max(0, now - currentState.startedAtMs) : 0
      const remainingDurationMs = currentState.startedAtMs
        ? Math.max(0, totalDurationMs - elapsed)
        : totalDurationMs

      clearBubbleTimer()

      if (remainingDurationMs <= 0) {
        log.info('useBubbleController', 'Timer expired immediately after reschedule', {
          itemId: item.id,
          totalDurationMs,
          elapsed,
          reason,
        })
        hideBubble('timer-elapsed')
        return
      }

      timerStateRef.current = {
        item,
        index,
        totalDurationMs,
        startedAtMs: startedAt,
        waitingForPlayback: false,
        expiryReason: reason,
      }

      if (totalDurationMs <= 0) {
        log.debug('useBubbleController', 'Timer scheduling skipped (unknown duration)', {
          reason,
        })
        return
      }

      bubbleTimerRef.current = setTimeout(() => {
        log.info('useBubbleController', 'Bubble hide timer triggered', {
          itemId: item.id,
          totalDurationMs,
          reason,
          actualElapsed: Date.now() - (timerStateRef.current.startedAtMs ?? startedAt),
        })

        const handled = options.onBubbleTimerElapsed?.({
          index,
          item,
          displayDurationMs: totalDurationMs,
          reason,
        })

        if (handled !== true) {
          hideBubble('timer-elapsed')
        }
      }, remainingDurationMs)

      options.onBubbleTimerUpdate?.({
        index,
        item,
        displayDurationMs: totalDurationMs,
        reason,
      })
    },
    [clearBubbleTimer, hideBubble, options]
  )

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

      clearBubbleTimer()

      setCurrentBubbleIndex(index)
      setBubbleVisible(true)
      lastBubbleShowTimeRef.current = Date.now()

      const hasAudioUrl = Boolean(audioUrls[item.id])
      const displayDurationMs = calculateDisplayDuration(hasAudioUrl, audioDuration)

      timerStateRef.current = {
        item,
        index,
        totalDurationMs: hasAudioUrl ? 0 : displayDurationMs,
        startedAtMs: null,
        waitingForPlayback: hasAudioUrl,
        expiryReason: null,
      }

      options.onBubbleShow?.({ index, item, displayDurationMs })

      if (!hasAudioUrl) {
        scheduleBubbleHide({ index, item, reason: 'initial' })
      }
    },
    [audioDuration, audioUrls, clearBubbleTimer, options, scheduleBubbleHide]
  )

  useEffect(() => {
    if (!bubbleVisible) {
      return
    }

    const currentState = timerStateRef.current
    if (!currentState.item || currentState.index === null) {
      return
    }

    if (isPlaying) {
      if (currentState.waitingForPlayback && currentState.startedAtMs === null) {
        if (currentState.totalDurationMs > 0) {
          log.info('useBubbleController', 'Starting bubble timer on playback start', {
            itemId: currentState.item.id,
          })
          scheduleBubbleHide({
            index: currentState.index,
            item: currentState.item,
            reason: 'playback-start',
          })
        } else {
          log.debug(
            'useBubbleController',
            'Playback started but audio duration unknown; waiting for coordinator to hide',
            {
              itemId: currentState.item.id,
            }
          )
        }
      }
      return
    }

    if (currentState.startedAtMs !== null) {
      log.info('useBubbleController', 'Playback paused or ended — hiding bubble immediately', {
        itemId: currentState.item.id,
      })
      hideBubble('playback-paused')
    }
  }, [bubbleVisible, hideBubble, isPlaying, options, scheduleBubbleHide])

  useEffect(() => {
    const currentState = timerStateRef.current
    if (!bubbleVisible || !currentState.item || currentState.index === null) {
      return
    }

    const item = currentState.item
    const hasAudioUrl = Boolean(audioUrls[item.id])

    if (!hasAudioUrl) {
      return
    }

    const nextDurationMs = calculateDisplayDuration(true, audioDuration)

    if (nextDurationMs <= 0) {
      return
    }

    if (currentState.totalDurationMs === nextDurationMs) {
      return
    }

    timerStateRef.current = {
      ...currentState,
      totalDurationMs: nextDurationMs,
    }

    log.info('useBubbleController', 'Resolved bubble duration', {
      itemId: item.id,
      previousDurationMs: currentState.totalDurationMs,
      nextDurationMs,
    })

    if (currentState.startedAtMs !== null || isPlaying) {
      scheduleBubbleHide({
        index: currentState.index,
        item,
        reason: 'duration-update',
      })
    }
  }, [audioDuration, audioUrls, bubbleVisible, isPlaying, options, scheduleBubbleHide])

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

        if (canShow) {
          log.info('useBubbleController', 'Triggering bubble show', {
            index,
            itemId: item.id,
            itemTimestamp: item.timestamp,
            currentTimeMs,
            timeDiff,
          })
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
