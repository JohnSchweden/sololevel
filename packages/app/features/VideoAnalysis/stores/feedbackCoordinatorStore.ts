import { log } from '@my/logging'
import { create } from 'zustand'

/**
 * Granular Zustand store for feedback coordinator state.
 *
 * **Purpose:** Prevent unnecessary re-renders by allowing components to subscribe
 * only to specific slices of state they actually need.
 *
 * **Problem Solved:**
 * Before: useFeedbackCoordinator returned entire object. When any property changed
 * (e.g., highlightedFeedbackId every 250ms), ALL subscribers re-rendered.
 *
 * After: Components use granular selectors like:
 * - `store(s => s.highlightedFeedbackId)` - only re-renders when ID changes
 * - `store(s => s.isCoachSpeaking)` - only re-renders when speaking state changes
 * - `store(s => s.bubbleState)` - only re-renders when bubble state changes
 *
 * **Impact:** Reduces VideoAnalysisLayout renders from 200+ to ~10 during video playback.
 *
 * @see VideoAnalysisScreen - uses selectors to prevent cascade
 * @see VideoAnalysisLayout - uses selectors for granular updates
 * @see useFeedbackCoordinator - updates this store instead of returning aggregated state
 */

export interface FeedbackCoordinatorState {
  // Selection state
  selectedFeedbackId: string | null
  highlightedFeedbackId: string | null
  highlightSource: 'user' | 'auto' | null
  isCoachSpeaking: boolean

  // Bubble state
  bubbleState: {
    currentBubbleIndex: number | null
    bubbleVisible: boolean
  }

  // Overlay state
  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null

  // Actions for updating state
  setSelectedFeedbackId: (id: string | null) => void
  setHighlightedFeedbackId: (id: string | null) => void
  setHighlightSource: (source: 'user' | 'auto' | null) => void
  setIsCoachSpeaking: (speaking: boolean) => void
  setBubbleState: (state: { currentBubbleIndex: number | null; bubbleVisible: boolean }) => void
  setOverlayVisible: (visible: boolean) => void
  setActiveAudio: (audio: { id: string; url: string } | null) => void

  // Batch update to combine multiple state changes in single transaction
  // This prevents multiple re-renders when several properties change together
  batchUpdate: (
    updates: Partial<Omit<FeedbackCoordinatorState, keyof FeedbackCoordinatorActions>>
  ) => void

  // Reset to initial state (useful for tests and cleanup)
  reset: () => void
}

// Extract action types for type safety
type FeedbackCoordinatorActions = Pick<
  FeedbackCoordinatorState,
  | 'setSelectedFeedbackId'
  | 'setHighlightedFeedbackId'
  | 'setHighlightSource'
  | 'setIsCoachSpeaking'
  | 'setBubbleState'
  | 'setOverlayVisible'
  | 'setActiveAudio'
  | 'batchUpdate'
  | 'reset'
>

const initialState = {
  selectedFeedbackId: null,
  highlightedFeedbackId: null,
  highlightSource: null,
  isCoachSpeaking: false,
  bubbleState: {
    currentBubbleIndex: null,
    bubbleVisible: false,
  },
  overlayVisible: false,
  activeAudio: null,
}

export const useFeedbackCoordinatorStore = create<FeedbackCoordinatorState>((set, get) => ({
  // Initial state
  ...initialState,

  // Actions with logging
  setSelectedFeedbackId: (id) => {
    const prev = get().selectedFeedbackId
    if (prev !== id) {
      log.debug('FeedbackCoordinatorStore', '🔄 setSelectedFeedbackId', { prev, next: id })
      set({ selectedFeedbackId: id })
    }
  },
  setHighlightedFeedbackId: (id) => {
    const prev = get().highlightedFeedbackId
    if (prev !== id) {
      log.debug('FeedbackCoordinatorStore', '🔄 setHighlightedFeedbackId', { prev, next: id })
      set({ highlightedFeedbackId: id })
    }
  },
  setHighlightSource: (source) => {
    const prev = get().highlightSource
    if (prev !== source) {
      log.debug('FeedbackCoordinatorStore', '🔄 setHighlightSource', { prev, next: source })
      set({ highlightSource: source })
    }
  },
  setIsCoachSpeaking: (speaking) => {
    const prev = get().isCoachSpeaking
    if (prev !== speaking) {
      log.debug('FeedbackCoordinatorStore', '🔄 setIsCoachSpeaking', { prev, next: speaking })
      set({ isCoachSpeaking: speaking })
    }
  },
  setBubbleState: (bubbleState) => {
    const prev = get().bubbleState
    const changed =
      prev.currentBubbleIndex !== bubbleState.currentBubbleIndex ||
      prev.bubbleVisible !== bubbleState.bubbleVisible
    if (changed) {
      log.debug('FeedbackCoordinatorStore', '🔄 setBubbleState', {
        prev: { currentIndex: prev.currentBubbleIndex, visible: prev.bubbleVisible },
        next: { currentIndex: bubbleState.currentBubbleIndex, visible: bubbleState.bubbleVisible },
      })
      set({ bubbleState })
    }
  },
  setOverlayVisible: (visible) => {
    const prev = get().overlayVisible
    if (prev !== visible) {
      log.debug('FeedbackCoordinatorStore', '🔄 setOverlayVisible', { prev, next: visible })
      set({ overlayVisible: visible })
    }
  },
  setActiveAudio: (audio) => {
    const prev = get().activeAudio
    const changed = prev?.id !== audio?.id || prev?.url !== audio?.url
    if (changed) {
      log.debug('FeedbackCoordinatorStore', '🔄 setActiveAudio', {
        prev: prev ? { id: prev.id, url: prev.url } : null,
        next: audio ? { id: audio.id, url: audio.url } : null,
      })
      set({ activeAudio: audio })
    }
  },

  // Batch update - combines multiple state changes into single transaction
  // Zustand batches state updates automatically within set(), so this is a single render
  batchUpdate: (updates) => {
    const prevState = get()
    const changes: Record<string, any> = {}

    // Track what's actually changing
    if (
      updates.selectedFeedbackId !== undefined &&
      updates.selectedFeedbackId !== prevState.selectedFeedbackId
    ) {
      changes.selectedFeedbackId = {
        prev: prevState.selectedFeedbackId,
        next: updates.selectedFeedbackId,
      }
    }
    if (
      updates.highlightedFeedbackId !== undefined &&
      updates.highlightedFeedbackId !== prevState.highlightedFeedbackId
    ) {
      changes.highlightedFeedbackId = {
        prev: prevState.highlightedFeedbackId,
        next: updates.highlightedFeedbackId,
      }
    }
    if (
      updates.highlightSource !== undefined &&
      updates.highlightSource !== prevState.highlightSource
    ) {
      changes.highlightSource = {
        prev: prevState.highlightSource,
        next: updates.highlightSource,
      }
    }
    if (
      updates.isCoachSpeaking !== undefined &&
      updates.isCoachSpeaking !== prevState.isCoachSpeaking
    ) {
      changes.isCoachSpeaking = { prev: prevState.isCoachSpeaking, next: updates.isCoachSpeaking }
    }
    if (updates.bubbleState !== undefined) {
      const prevBubble = prevState.bubbleState
      const nextBubble = updates.bubbleState
      if (
        prevBubble.currentBubbleIndex !== nextBubble.currentBubbleIndex ||
        prevBubble.bubbleVisible !== nextBubble.bubbleVisible
      ) {
        changes.bubbleState = {
          prev: { currentIndex: prevBubble.currentBubbleIndex, visible: prevBubble.bubbleVisible },
          next: { currentIndex: nextBubble.currentBubbleIndex, visible: nextBubble.bubbleVisible },
        }
      }
    }
    if (
      updates.overlayVisible !== undefined &&
      updates.overlayVisible !== prevState.overlayVisible
    ) {
      changes.overlayVisible = { prev: prevState.overlayVisible, next: updates.overlayVisible }
    }
    if (updates.activeAudio !== undefined) {
      const prevAudio = prevState.activeAudio
      const nextAudio = updates.activeAudio
      if (prevAudio?.id !== nextAudio?.id || prevAudio?.url !== nextAudio?.url) {
        changes.activeAudio = {
          prev: prevAudio ? { id: prevAudio.id, url: prevAudio.url } : null,
          next: nextAudio ? { id: nextAudio.id, url: nextAudio.url } : null,
        }
      }
    }

    if (Object.keys(changes).length > 0) {
      log.debug('FeedbackCoordinatorStore', '🔄 batchUpdate', { changes })
    }

    set(updates)
  },

  // Reset to initial state
  reset: () => {
    log.debug('FeedbackCoordinatorStore', '🔄 reset')
    set(initialState)
  },
}))
