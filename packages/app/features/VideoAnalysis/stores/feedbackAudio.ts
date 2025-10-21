import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface FeedbackAudioState {
  audioPaths: Record<string, string>
  getAudioPath: (feedbackId: string) => string | null
  setAudioPath: (feedbackId: string, path: string | null) => void
  reset: () => void
}

export const useFeedbackAudioStore = create<FeedbackAudioState>()(
  immer((set, get) => ({
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
    reset: () => {
      set((draft) => {
        draft.audioPaths = {}
      })
    },
  }))
)
