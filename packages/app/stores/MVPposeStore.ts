import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware/persist'

// Minimal types for MVP - matching UI component expectations
export interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

export interface PoseData {
  id: string
  timestamp: number
  joints: Joint[]
  confidence: number
}

export type ProcessingQuality = 'low' | 'medium' | 'high'

// Minimal MVP pose store interface
export interface MVPposeStore {
  // State
  currentPose: PoseData | null
  poseHistory: PoseData[]
  processingQuality: ProcessingQuality
  errors: string[]

  // Actions
  processPose: (poseData: PoseData) => void
  addError: (error: string) => void
  clearErrors: () => void
  clearHistory: () => void
}

// Create the minimal MVP pose store
export const usePoseStore = create<MVPposeStore>()(
  subscribeWithSelector(
    immer(
      persist(
        (set) => ({
          // Initial state
          currentPose: null,
          poseHistory: [],
          processingQuality: 'medium',
          errors: [],

          // Actions
          processPose: (poseData: PoseData) => {
            set((draft) => {
              draft.currentPose = poseData

              // Add to history (keep last 100 poses)
              draft.poseHistory.push(poseData)
              if (draft.poseHistory.length > 100) {
                draft.poseHistory.shift()
              }
            })
          },

          addError: (error: string) => {
            set((draft) => {
              draft.errors.push(error)
              // Keep only last 10 errors
              if (draft.errors.length > 10) {
                draft.errors.shift()
              }
            })
          },

          clearErrors: () => {
            set((draft) => {
              draft.errors = []
            })
          },

          clearHistory: () => {
            set((draft) => {
              draft.poseHistory = []
            })
          },
        }),
        {
          name: 'mvp-pose-store',
          partialize: (state) => ({
            processingQuality: state.processingQuality,
          }),
        }
      )
    )
  )
)
