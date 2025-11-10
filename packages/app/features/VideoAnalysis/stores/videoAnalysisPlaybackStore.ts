import { create } from 'zustand'

/**
 * Video Player Playback Store
 *
 * Zustand store for video playback state to eliminate useState render cascades.
 *
 * ## Problem
 * `useVideoPlayer` had 5 useState hooks causing 16+ re-renders per second during playback:
 * - isPlaying: onChange triggers re-render
 * - displayTime: updates every 1s → 3 renders (Screen + Layout + VideoPlayer)
 * - duration: onChange triggers re-render
 * - pendingSeek: onChange triggers re-render
 * - videoEnded: onChange triggers re-render
 *
 * Result: 300MB → 700MB memory growth, FPS drops to 5-10.
 *
 * ## Solution
 * Zustand store allows:
 * 1. Granular subscriptions - components only re-render when their specific field changes
 * 2. No cascade renders - store updates don't trigger parent re-renders
 * 3. Ref-based precise time - no re-renders for high-frequency updates
 *
 * ## Usage
 * ```typescript
 * // Write (from useVideoPlayer)
 * const { setIsPlaying, setDisplayTime } = useVideoPlayerStore()
 *
 * // Read (granular subscriptions)
 * const isPlaying = useVideoPlayerStore((state) => state.isPlaying)
 * const displayTime = useVideoPlayerStore((state) => state.displayTime)
 * ```
 *
 * @see useVideoPlayer - writes to this store
 * @see VideoAnalysisScreen - reads from this store
 */

export interface VideoPlayerStoreState {
  // Playback state (replaces useState hooks)
  isPlaying: boolean
  displayTime: number // Display time - updates every 1 second
  duration: number
  pendingSeek: number | null
  videoEnded: boolean

  // Controls state
  controlsVisible: boolean
  manualControlsVisible: boolean | null

  // Imperative seek function (registered by VideoPlayerSection)
  // Allows feedback coordinator to seek immediately without React render latency
  seekImmediate: ((time: number) => void) | null

  // Actions
  setIsPlaying: (isPlaying: boolean) => void
  setDisplayTime: (time: number) => void
  setDuration: (duration: number) => void
  setPendingSeek: (time: number | null) => void
  setVideoEnded: (ended: boolean) => void
  setControlsVisible: (visible: boolean) => void
  setManualControlsVisible: (visible: boolean | null) => void
  setSeekImmediate: (fn: ((time: number) => void) | null) => void

  // Batch updates (for atomic state changes)
  batchUpdate: (
    updates: Partial<Omit<VideoPlayerStoreState, keyof VideoPlayerStoreActions>>
  ) => void

  // Reset
  reset: () => void
}

type VideoPlayerStoreActions = {
  setIsPlaying: VideoPlayerStoreState['setIsPlaying']
  setDisplayTime: VideoPlayerStoreState['setDisplayTime']
  setDuration: VideoPlayerStoreState['setDuration']
  setPendingSeek: VideoPlayerStoreState['setPendingSeek']
  setVideoEnded: VideoPlayerStoreState['setVideoEnded']
  setControlsVisible: VideoPlayerStoreState['setControlsVisible']
  setManualControlsVisible: VideoPlayerStoreState['setManualControlsVisible']
  setSeekImmediate: VideoPlayerStoreState['setSeekImmediate']
  batchUpdate: VideoPlayerStoreState['batchUpdate']
  reset: VideoPlayerStoreState['reset']
}

const initialState = {
  isPlaying: false,
  displayTime: 0,
  duration: 0,
  pendingSeek: null,
  videoEnded: false,
  controlsVisible: false,
  manualControlsVisible: null,
  seekImmediate: null,
}

export const useVideoPlayerStore = create<VideoPlayerStoreState>((set) => ({
  ...initialState,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDisplayTime: (displayTime) => set({ displayTime }),
  setDuration: (duration) => set({ duration }),
  setPendingSeek: (pendingSeek) => set({ pendingSeek }),
  setVideoEnded: (videoEnded) => set({ videoEnded }),
  setControlsVisible: (controlsVisible) => set({ controlsVisible }),
  setManualControlsVisible: (manualControlsVisible) => set({ manualControlsVisible }),
  setSeekImmediate: (seekImmediate) => set({ seekImmediate }),

  batchUpdate: (updates) => set(updates),

  reset: () => set(initialState),
}))
