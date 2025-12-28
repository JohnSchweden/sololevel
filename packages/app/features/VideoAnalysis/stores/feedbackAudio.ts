import { mmkvStorage } from '@my/config'
import { log } from '@my/logging'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { AudioControllerState } from '../hooks/useAudioController'

/**
 * Global audio playback store that bridges the UI, coordinator, and
 * `useAudioController`. Keeps playback metadata outside React state so
 * screens stay dark while audio updates every few milliseconds.
 *
 * @remarks
 * - `controller` is registered by `useAudioController` so the store can
 *   resume playback when switching between feedback items.
 * - Logging is intentionally verbose while we stabilise the new pipeline;
 *   revisit once regressions are ruled out.
 */
export interface FeedbackAudioState {
  // Persistent audio file paths (survives app restarts)
  audioPaths: Record<string, string>
  getAudioPath: (feedbackId: string) => string | null
  setAudioPath: (feedbackId: string, path: string | null) => void

  // Current session audio URLs, errors, and active audio (for UI components)
  audioUrls: Record<string, string>
  errors: Record<string, string>
  activeAudio: { id: string; url: string } | null
  isPlaying: boolean
  controller: AudioControllerState | null
  setAudioUrls: (urls: Record<string, string>) => void
  setErrors: (errors: Record<string, string>) => void
  setActiveAudio: (activeAudio: { id: string; url: string } | null) => void
  setIsPlaying: (isPlaying: boolean) => void
  setController: (controller: AudioControllerState | null) => void
  clearError: (feedbackId: string) => void

  reset: () => void
}

/**
 * Zustand store for feedback audio playback. Public consumers should prefer
 * reading via selectors (no prop drilling) and use the provided actions to
 * mutate state.
 *
 * PERF: audioPaths is persisted to MMKV - survives app restarts
 * This eliminates filesystem checks on navigation (250ms+ saved per feedback)
 */
export const useFeedbackAudioStore = create<FeedbackAudioState>()(
  persist(
    immer((set, get) => ({
      // Persistent audio file paths (persisted to MMKV)
      audioPaths: {},
      getAudioPath: (feedbackId) => get().audioPaths[feedbackId] ?? null,
      setAudioPath: (feedbackId, path) => {
        set((draft) => {
          if (!path) {
            delete draft.audioPaths[feedbackId]
          } else {
            draft.audioPaths[feedbackId] = path
          }
        })
      },

      // Current session audio URLs, errors, and active audio (NOT persisted)
      audioUrls: {},
      errors: {},
      activeAudio: null,
      isPlaying: false,
      controller: null,
      setAudioUrls: (urls) => {
        set((draft) => {
          draft.audioUrls = urls
        })
      },
      setErrors: (errors) => {
        set((draft) => {
          draft.errors = errors
        })
      },
      setActiveAudio: (activeAudio) => {
        set((draft) => {
          const previousId = draft.activeAudio?.id ?? null
          draft.activeAudio = activeAudio

          log.debug(
            'feedbackAudioStore.setActiveAudio',
            `Audio changed ${previousId} → ${activeAudio?.id ?? null}`,
            {
              activeAudioId: activeAudio?.id ?? null,
              hasUrl: !!activeAudio?.url,
              urlPreview: activeAudio?.url ? activeAudio.url.substring(0, 60) + '...' : 'N/A',
            }
          )

          if (!activeAudio) {
            draft.isPlaying = false
          }
        })
      },
      setIsPlaying: (isPlaying) => {
        set((draft) => {
          const wasPlaying = draft.isPlaying
          draft.isPlaying = isPlaying

          log.debug(
            'feedbackAudioStore.setIsPlaying',
            `Toggling playback ${wasPlaying} → ${isPlaying}`,
            {
              hasController: !!draft.controller,
              activeAudioId: draft.activeAudio?.id ?? null,
              controllerFn: draft.controller?.setIsPlaying ? 'exists' : 'MISSING',
            }
          )

          draft.controller?.setIsPlaying(isPlaying)
        })
      },
      setController: (controller) => {
        const shouldResume = !!controller && get().isPlaying

        set((draft) => {
          draft.controller = controller
          log.debug('feedbackAudioStore.setController', `Audio controller registered`, {
            hasController: !!controller,
            hasSetIsPlaying: !!controller?.setIsPlaying,
            shouldResume,
          })
        })

        if (shouldResume && controller?.setIsPlaying) {
          log.debug('feedbackAudioStore.setController', 'Resuming playback on new controller', {
            activeAudioId: get().activeAudio?.id ?? null,
          })
          controller.setIsPlaying(true)
        }
      },
      clearError: (feedbackId) => {
        set((draft) => {
          delete draft.errors[feedbackId]
        })
      },

      reset: () => {
        set((draft) => {
          // Keep audioPaths on reset - only clear session state
          // audioPaths represents persisted file locations that survive app restarts
          draft.audioUrls = {}
          draft.errors = {}
          draft.activeAudio = null
          draft.isPlaying = false
          draft.controller = null
        })
      },
    })),
    {
      name: 'feedback-audio-paths',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist audioPaths - transient state (audioUrls, errors, etc.) should NOT persist
      partialize: (state) => ({ audioPaths: state.audioPaths }),
    }
  )
)
