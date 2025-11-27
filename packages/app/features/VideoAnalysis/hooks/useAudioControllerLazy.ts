import { useRef, useState } from 'react'

import type { AudioControllerState } from './useAudioController'
import { useAudioController } from './useAudioController'
import type { UseAudioControllerCallbacks } from './useAudioController'

/**
 * Lazy wrapper for useAudioController that defers initialization until first use.
 *
 * ## Performance Optimization (Module 3)
 * - Initializes useAudioController (14 useEffects) only when audio playback is needed
 * - Returns stub controller on mount (no effects, no overhead)
 * - Automatically switches to real controller on first play/seek/etc
 * - Expected mount time reduction: ~50-100ms
 *
 * ## When Initialization Triggers
 * - `setIsPlaying(true)` - User starts playback
 * - `togglePlayback()` - User toggles playback
 * - `seekTo(time)` - User seeks audio
 * - `handleLoad()` - Audio loads (if URL provided)
 *
 * ## Stub Controller Behavior
 * - All methods are no-ops until initialization
 * - State getters return default values (false, 0, null)
 * - After initialization, delegates all calls to real controller
 *
 * **Note:** React hooks must be called unconditionally, so we always call `useAudioController`
 * but wrap it in a way that prevents effects from running until needed. This is achieved
 * by using a state flag that triggers the hook's execution after the first method call.
 *
 * @param audioUrl - Resolved feedback audio URL or `null` to clear playback.
 * @param callbacks - Optional lifecycle callbacks (e.g. natural end hook).
 * @returns Stub controller (initially) or real AudioControllerState (after initialization)
 */
export function useAudioControllerLazy(
  audioUrl: string | null,
  callbacks: UseAudioControllerCallbacks = {}
): AudioControllerState {
  const [shouldInitialize, setShouldInitialize] = useState(false)

  // CRITICAL: React hooks must be called unconditionally
  // We always call useAudioController, but pass lazy=true until initialization
  // This defers all 14 useEffects until first play/seek/etc call
  const realController = useAudioController(
    shouldInitialize ? audioUrl : null,
    shouldInitialize ? callbacks : {},
    !shouldInitialize // lazy=true until initialization
  )

  // Create stub controller that triggers initialization
  // Use ref to maintain stable reference across renders (prevents useEffect re-triggers)
  const stubControllerRef = useRef<AudioControllerState | null>(null)
  const initializeRef = useRef(() => {
    setShouldInitialize(true)
  })

  if (!stubControllerRef.current) {
    stubControllerRef.current = createStubController(initializeRef.current)
  }

  // Return real controller if initialized, otherwise stub
  if (shouldInitialize) {
    return realController
  }

  // Return stable stub controller reference (prevents re-renders in VideoPlayerSection)
  return stubControllerRef.current
}

/**
 * Creates a stub controller with default values and initialization triggers
 */
function createStubController(onInitialize: () => void): AudioControllerState {
  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    seekTime: null,
    setIsPlaying: (playing: boolean) => {
      if (playing) {
        onInitialize()
      }
    },
    togglePlayback: () => {
      onInitialize()
    },
    seekTo: () => {
      onInitialize()
    },
    handleLoad: () => {
      onInitialize()
    },
    handleProgress: () => {
      // No-op
    },
    handleEnd: () => {
      // No-op
    },
    handleError: () => {
      // No-op
    },
    handleSeekComplete: () => {
      // No-op
    },
    reset: () => {
      // No-op
    },
  }
}
