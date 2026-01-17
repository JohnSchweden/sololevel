import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import { estimateFeedbackDuration } from '../utils/feedbackDuration'

export type BubbleTimerReason = 'initial' | 'playback-start' | 'duration-update'
export type BubbleHideReason =
  | 'manual'
  | 'timer-elapsed'
  | 'playback-paused'
  | 'cleanup'
  | 'audio-stop'

export interface BubbleControllerState<TItem extends BubbleFeedbackItem = BubbleFeedbackItem> {
  /**
   * @deprecated Read from FeedbackCoordinatorStore instead
   * Use: `store(s => s.bubbleState.currentBubbleIndex)`
   */
  currentBubbleIndex: number | null
  /**
   * @deprecated Read from FeedbackCoordinatorStore instead
   * Use: `store(s => s.bubbleState.bubbleVisible)`
   */
  bubbleVisible: boolean
  showBubble: (index: number) => void
  hideBubble: (reason?: BubbleHideReason) => void
  checkAndShowBubbleAtTime: (currentTimeMs: number) => number | null
  // NEW: Pure detection without side effects
  findTriggerCandidate: (currentTimeMs: number) => { index: number; item: TItem } | null
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
  text?: string
}

const MIN_DISPLAY_DURATION_MS = 3000
const TIMESTAMP_THRESHOLD_MS = 500
const CHECK_THROTTLE_MS = 50
// Forward seek detection: if time jumps more than this threshold, treat as seek
// FIX: Increased from 500ms to 1500ms to avoid false positives from playback jitter
// Normal playback can have gaps of 500-600ms due to JS thread delays
// Real seeks (user tapping timeline) typically jump 2+ seconds
const FORWARD_SEEK_THRESHOLD_MS = 1500

type BubbleTimerState<TItem extends BubbleFeedbackItem> = {
  item: TItem | null
  index: number | null
  totalDurationMs: number
  startedAtMs: number | null
  pausedAtMs: number | null
  totalPausedDurationMs: number
  waitingForPlayback: boolean
  expiryReason: BubbleTimerReason | null
}

const defaultTimerState: BubbleTimerState<BubbleFeedbackItem> = {
  item: null,
  index: null,
  totalDurationMs: MIN_DISPLAY_DURATION_MS,
  startedAtMs: null,
  pausedAtMs: null,
  totalPausedDurationMs: 0,
  waitingForPlayback: false,
  expiryReason: null,
}

const calculateDisplayDuration = (
  hasAudioUrl: boolean,
  audioDurationSeconds: number,
  feedbackText?: string
) => {
  if (!hasAudioUrl) {
    // Use text-based estimation when no audio is available
    return estimateFeedbackDuration(feedbackText)
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
  // PERF FIX: Move bubble state to Zustand store to prevent re-renders in VideoAnalysisScreen
  // Read state imperatively; update store to broadcast to subscribers only
  const getBubbleState = useCallback(() => useFeedbackCoordinatorStore.getState().bubbleState, [])
  const setBubbleStateInStore = useFeedbackCoordinatorStore((state) => state.setBubbleState)

  // Subscribe to fallback timer state for feedback without audio
  const isFallbackTimerActive = useFeedbackCoordinatorStore((state) => state.isFallbackTimerActive)

  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBubbleShowTimeRef = useRef<number>(0)
  const lastCheckTimestampRef = useRef<number | null>(null)
  const feedbackItemsRef = useRef(feedbackItems)
  const timerStateRef = useRef<BubbleTimerState<TItem>>({
    ...defaultTimerState,
  } as BubbleTimerState<TItem>)
  const isMountedRef = useRef(true)

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
      isMountedRef.current = false
      clearBubbleTimer()
    }
  }, [clearBubbleTimer])

  useEffect(() => {
    // FIX: Don't set lastCheck to 0 on first render - it causes false positive forward seek detection
    // Only update if currentTime is meaningful (> 0) and would increase lastCheck
    const currentTimeMs = currentTime * 1000
    if (currentTimeMs > 0) {
      lastCheckTimestampRef.current = Math.max(
        lastCheckTimestampRef.current ?? currentTimeMs,
        currentTimeMs
      )
    }
  }, [currentTime])

  const hideBubble = useCallback(
    (reason: BubbleHideReason = 'manual') => {
      const currentState = getBubbleState()

      // PERFORMANCE: Early exit if bubble already hidden
      // Prevents redundant store writes and timer operations
      if (!currentState.bubbleVisible && currentState.currentBubbleIndex === null) {
        log.debug('useBubbleController.hideBubble', '⏭️ Skipping hide - bubble already hidden', {
          reason,
          currentBubbleIndex: currentState.currentBubbleIndex,
          currentBubbleVisible: currentState.bubbleVisible,
        })
        return
      }

      log.debug('useBubbleController.hideBubble', '💬 Hiding bubble', {
        reason,
        currentBubbleIndex: currentState.currentBubbleIndex,
        currentBubbleVisible: currentState.bubbleVisible,
        currentItemId:
          currentState.currentBubbleIndex !== null
            ? feedbackItemsRef.current[currentState.currentBubbleIndex]?.id
            : null,
      })

      // Reset lastCheck tracking when hiding bubble
      // Set to previous item's timestamp to prevent immediate re-trigger
      // This ensures the next detection doesn't match this same item again
      const previousItem =
        currentState.currentBubbleIndex !== null
          ? (feedbackItemsRef.current[currentState.currentBubbleIndex] ?? null)
          : null
      lastCheckTimestampRef.current = previousItem?.timestamp ?? null

      log.debug('useBubbleController.hideBubble', '🔄 Reset lastCheck after hide', {
        previousItemId: previousItem?.id,
        previousItemTimestamp: previousItem?.timestamp,
        lastCheckTimestampRef: lastCheckTimestampRef.current,
      })

      setBubbleStateInStore({ currentBubbleIndex: null, bubbleVisible: false })
      clearBubbleTimer()
      resetTimerState()

      const currentItem =
        currentState.currentBubbleIndex !== null
          ? (feedbackItemsRef.current[currentState.currentBubbleIndex] ?? null)
          : null
      options.onBubbleHide?.({
        index: currentState.currentBubbleIndex,
        item: currentItem,
        reason,
      })
    },
    [clearBubbleTimer, getBubbleState, options, resetTimerState, setBubbleStateInStore]
  )

  const scheduleBubbleHide = useCallback(
    (params: { index: number; item: TItem; reason: BubbleTimerReason }) => {
      const { index, item, reason } = params
      const now = Date.now()
      const currentState = timerStateRef.current
      const startedAt = currentState.startedAtMs ?? now
      const totalDurationMs = currentState.totalDurationMs
      // Calculate elapsed time accounting for pause duration
      const elapsed = currentState.startedAtMs
        ? Math.max(0, now - currentState.startedAtMs - currentState.totalPausedDurationMs)
        : 0
      const remainingDurationMs = currentState.startedAtMs
        ? Math.max(0, totalDurationMs - elapsed)
        : totalDurationMs

      clearBubbleTimer()

      if (remainingDurationMs <= 0) {
        // log.info('useBubbleController', 'Timer expired immediately after reschedule', {
        //   itemId: item.id,
        //   totalDurationMs,
        //   elapsed,
        //   reason,
        // })
        hideBubble('timer-elapsed')
        return
      }

      timerStateRef.current = {
        item,
        index,
        totalDurationMs,
        startedAtMs: startedAt,
        pausedAtMs: null,
        totalPausedDurationMs: currentState.totalPausedDurationMs,
        waitingForPlayback: false,
        expiryReason: reason,
      }

      if (totalDurationMs <= 0) {
        // log.debug('useBubbleController', 'Timer scheduling skipped (unknown duration)', {
        //   reason,
        // })
        return
      }

      bubbleTimerRef.current = setTimeout(() => {
        // Prevent state updates after unmount
        if (!isMountedRef.current) return

        // log.info('useBubbleController', 'Bubble hide timer triggered', {
        //   itemId: item.id,
        //   totalDurationMs,
        //   reason,
        //   actualElapsed: Date.now() - (timerStateRef.current.startedAtMs ?? startedAt),
        // })

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

      const currentState = getBubbleState()
      log.debug('useBubbleController.showBubble', '💬 Showing bubble', {
        index,
        itemId: item.id,
        timestamp: item.timestamp,
        previousBubbleIndex: currentState.currentBubbleIndex,
        previousBubbleVisible: currentState.bubbleVisible,
        totalFeedbacks: feedbackItemsRef.current.length,
      })

      // Reset lastCheck tracking when showing a new bubble
      // Prevents stale lastCheck from blocking future triggers after seek/manual selection
      lastCheckTimestampRef.current = item.timestamp

      clearBubbleTimer()

      setBubbleStateInStore({ currentBubbleIndex: index, bubbleVisible: true })
      lastBubbleShowTimeRef.current = Date.now()

      const hasAudioUrl = Boolean(audioUrls[item.id])
      const displayDurationMs = calculateDisplayDuration(hasAudioUrl, audioDuration, item.text)

      timerStateRef.current = {
        item,
        index,
        totalDurationMs: hasAudioUrl ? 0 : displayDurationMs,
        startedAtMs: null,
        pausedAtMs: null,
        totalPausedDurationMs: 0,
        waitingForPlayback: hasAudioUrl,
        expiryReason: null,
      }

      options.onBubbleShow?.({ index, item, displayDurationMs })

      if (!hasAudioUrl) {
        scheduleBubbleHide({ index, item, reason: 'initial' })
      }
    },
    [
      audioDuration,
      audioUrls,
      clearBubbleTimer,
      getBubbleState,
      options,
      scheduleBubbleHide,
      setBubbleStateInStore,
    ]
  )

  useEffect(() => {
    const storeState = getBubbleState()
    if (!storeState.bubbleVisible) {
      return
    }

    const currentState = timerStateRef.current
    if (!currentState.item || currentState.index === null) {
      return
    }

    // For feedback WITH audio: follow video isPlaying
    // For feedback WITHOUT audio: follow isFallbackTimerActive
    const hasAudioUrl = Boolean(audioUrls[currentState.item.id])
    const timerShouldRun = hasAudioUrl ? isPlaying : isFallbackTimerActive

    if (timerShouldRun) {
      // Resume: if we were paused, record the pause duration and reschedule
      if (currentState.pausedAtMs !== null) {
        const pauseDuration = Date.now() - currentState.pausedAtMs
        timerStateRef.current = {
          ...currentState,
          pausedAtMs: null,
          totalPausedDurationMs: currentState.totalPausedDurationMs + pauseDuration,
        }
        // Reschedule the timer with updated pause duration
        if (currentState.startedAtMs !== null && currentState.totalDurationMs > 0) {
          scheduleBubbleHide({
            index: currentState.index,
            item: currentState.item,
            reason: 'playback-start',
          })
        }
      } else if (currentState.waitingForPlayback && currentState.startedAtMs === null) {
        // Starting timer for the first time
        if (currentState.totalDurationMs > 0) {
          scheduleBubbleHide({
            index: currentState.index,
            item: currentState.item,
            reason: 'playback-start',
          })
        }
      }
      return
    }

    // Pause: clear timer but keep bubble visible, track pause start time
    if (currentState.startedAtMs !== null && currentState.pausedAtMs === null) {
      clearBubbleTimer()
      timerStateRef.current = {
        ...currentState,
        pausedAtMs: Date.now(),
      }
    }
  }, [
    getBubbleState,
    clearBubbleTimer,
    hideBubble,
    isPlaying,
    isFallbackTimerActive,
    audioUrls,
    options,
    scheduleBubbleHide,
  ])

  useEffect(() => {
    const storeState = getBubbleState()
    const currentState = timerStateRef.current
    if (!storeState.bubbleVisible || !currentState.item || currentState.index === null) {
      return
    }

    const item = currentState.item
    const hasAudioUrl = Boolean(audioUrls[item.id])

    if (!hasAudioUrl) {
      return
    }

    const nextDurationMs = calculateDisplayDuration(true, audioDuration, item.text)

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

    // log.info('useBubbleController', 'Resolved bubble duration', {
    //   itemId: item.id,
    //   previousDurationMs: currentState.totalDurationMs,
    //   nextDurationMs,
    // })

    if (currentState.startedAtMs !== null || isPlaying) {
      scheduleBubbleHide({
        index: currentState.index,
        item,
        reason: 'duration-update',
      })
    }
  }, [
    audioDuration,
    audioUrls,
    getBubbleState,
    isPlaying,
    isFallbackTimerActive,
    options,
    scheduleBubbleHide,
  ])

  // PURE: Find trigger candidate WITHOUT side effects
  // Returns index and item if a bubble should trigger, or null if no trigger
  // Does NOT call showBubble or update lastCheckTimestampRef
  const findTriggerCandidate = useCallback(
    (currentTimeMs: number) => {
      const lastCheck = lastCheckTimestampRef.current
      if (lastCheck !== null && Math.abs(currentTimeMs - lastCheck) < CHECK_THROTTLE_MS) {
        return null
      }

      const storeState = getBubbleState()

      // Detect forward seek: large jump forward indicates user seeked, not normal playback
      const isForwardSeek =
        lastCheck !== null && currentTimeMs - lastCheck > FORWARD_SEEK_THRESHOLD_MS
      const isBackwardSeek = lastCheck !== null && currentTimeMs < lastCheck
      const isSeekOrFirstCheck = lastCheck === null || isBackwardSeek || isForwardSeek

      for (let index = 0; index < feedbackItemsRef.current.length; index += 1) {
        const item = feedbackItemsRef.current[index]

        // Exact timing: only trigger when current time crosses the timestamp
        // On first check, backward seek, OR forward seek: trigger if within threshold of current time
        // On normal forward playback: trigger feedbacks that we just passed (prevents re-triggers)
        // FIX: Forward seek now uses threshold check to prevent triggering old feedbacks
        const isInRange = isSeekOrFirstCheck
          ? Math.abs(item.timestamp - currentTimeMs) < TIMESTAMP_THRESHOLD_MS
          : item.timestamp > lastCheck && item.timestamp <= currentTimeMs

        const canShow =
          isInRange && (!storeState.bubbleVisible || storeState.currentBubbleIndex !== index)

        if (canShow) {
          // Return candidate WITHOUT updating state or showing bubble
          return { index, item }
        }
      }

      return null
    },
    [getBubbleState]
  )

  // SIDE EFFECT: Show bubble at index and update tracking
  // Called AFTER coordinator approves the candidate
  const checkAndShowBubbleAtTime = useCallback(
    (currentTimeMs: number) => {
      const candidate = findTriggerCandidate(currentTimeMs)
      if (!candidate) {
        // No match - update lastCheck to current time
        lastCheckTimestampRef.current = currentTimeMs
        return null
      }

      // Update lastCheck to be at least the matched timestamp to prevent re-triggering
      lastCheckTimestampRef.current = Math.max(currentTimeMs, candidate.item.timestamp)

      showBubble(candidate.index)
      return candidate.index
    },
    [findTriggerCandidate, showBubble]
  )

  // Return callbacks only. State is stored in the Zustand store.
  // Components that need bubble state subscribe to the store directly.
  return useMemo(
    () => ({
      currentBubbleIndex: null, // Deprecated - read from store instead
      bubbleVisible: false, // Deprecated - read from store instead
      showBubble,
      hideBubble,
      checkAndShowBubbleAtTime,
      findTriggerCandidate, // NEW: Pure detection for coordinator use
    }),
    [showBubble, hideBubble, checkAndShowBubbleAtTime, findTriggerCandidate]
  )
}
