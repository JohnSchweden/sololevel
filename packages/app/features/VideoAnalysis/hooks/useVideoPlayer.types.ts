import type { MutableRefObject } from 'react'

/**
 * Imperative player surface exposed to consuming components.
 * Mirrors the legacy `useVideoPlayback` API so controls, coordinator, and tests
 * can keep using the same commands while the underlying implementation is unified.
 */
export interface VideoPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  replay: () => void
  getCurrentTime: () => number
  getDuration: () => number
}

/**
 * Configuration accepted by `useVideoPlayer`.
 *
 * - `initialStatus` and `isProcessing` come from the historical analysis pipeline
 *   (the same signals previously fanned out to `useVideoPlayback` + `useAutoPlayOnReady`).
 * - `audioIsPlaying` corresponds to `useVideoAudioSync` input so audio gating still works.
 * - `autoHideDurationMs` replaces the hard-coded timeout embedded in `useVideoControls`.
 */
/**
 * Options for useVideoPlayer hook.
 *
 * **CRITICAL:** `initialStatus` must be the **normalized readiness state**, not raw caller prop.
 * The auto-play logic depends on seeing `'ready'` to trigger playback in history mode.
 *
 * Example:
 * ```typescript
 * // ✅ CORRECT: normalize first
 * const normalized = isHistoryMode ? 'ready' : initialStatus
 * useVideoPlayer({ initialStatus: normalized, isProcessing, ... })
 *
 * // ❌ WRONG: direct pass breaks history auto-play
 * useVideoPlayer({ initialStatus, isProcessing, ... })
 * ```
 */
export interface UseVideoPlayerOptions {
  /**
   * Normalized analysis state ('processing'|'ready') or playback state ('playing'|'paused').
   * Pass the **normalized** readiness in VideoAnalysisScreen context (not raw prop).
   * Auto-play detects `'ready'` to play in history mode.
   */
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'

  /** Whether analysis is in-flight. Used to detect processing→ready transitions for auto-play. */
  isProcessing?: boolean

  /** Whether feedback audio is active. Gating for shouldPlayVideo calculation. */
  audioIsPlaying?: boolean

  /** Time before auto-hiding controls during playback (default 3000ms). */
  autoHideDurationMs?: number
}

/**
 * Unified player state returned by `useVideoPlayer`.
 *
 * The shape preserves every property that the four legacy hooks exposed so that
 * downstream consumers (`VideoAnalysisScreen`, feedback coordinator, layout) can
 * continue to destructure the same values while benefiting from a single source
 * of truth.
 */
export interface UseVideoPlayerReturn {
  ref: MutableRefObject<VideoPlayerRef | null>
  isPlaying: boolean
  // currentTime removed - consumers should read from store directly to prevent re-renders
  duration: number
  videoEnded: boolean
  pendingSeek: number | null
  currentTimeRef: MutableRefObject<number>
  getPreciseCurrentTime: () => number
  reset: () => void
  showControls: boolean
  showReplayButton: boolean
  shouldPlayVideo: boolean
  shouldPlayAudio: boolean
  isVideoPausedForAudio: boolean
  play: () => void
  pause: () => void
  replay: () => void
  seek: (time: number) => void
  onLoad: (data: { duration: number }) => void
  onProgress: (time: number) => void
  onEnd: (endTime?: number) => void
  onSeekComplete: (time: number | null) => void
  handleLoad: (data: { duration: number }) => void
  handleProgress: (time: number) => void
  handleEnd: (endTime?: number) => boolean
  handleSeekComplete: (time: number | null) => void
  setControlsVisible: (visible: boolean) => void
}

/**
 * Backwards-compatible subset used by the feedback coordinator and tests that
 * only care about playback data. Keeps the old `VideoPlaybackState` contract alive
 * while delegating to the consolidated hook.
 */
export type VideoPlaybackState = Pick<
  UseVideoPlayerReturn,
  | 'isPlaying'
  // currentTime removed - consumers should read from store directly
  | 'duration'
  | 'pendingSeek'
  | 'videoEnded'
  | 'currentTimeRef'
  | 'getPreciseCurrentTime'
  | 'play'
  | 'pause'
  | 'replay'
  | 'seek'
  | 'handleProgress'
  | 'handleLoad'
  | 'handleEnd'
  | 'handleSeekComplete'
  | 'reset'
>
