import type { PoseFrame } from '@api/src/validation/cameraRecordingSchemas'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Configuration constants
const MAX_POSE_HISTORY = 100

// Analysis stage types
export type AnalysisStage =
  | 'idle'
  | 'pose-detection'
  | 'video-analysis'
  | 'llm-feedback'
  | 'tts-generation'
  | 'completed'

// Error types following discriminated union pattern
export interface AnalysisError {
  code: string
  message: string
  timestamp: number
}

// Result types using discriminated unions
export type AnalysisResult =
  | { success: true; data: { analysisId: string; confidence: number; summary: string } }
  | { success: false; error: AnalysisError }

// Video analysis state interface
export interface VideoAnalysisState {
  // Current analysis session
  currentAnalysis: string | null

  // Real-time pose data streaming
  poseData: PoseFrame[]

  // Analysis progress tracking
  analysisProgress: number
  isAnalyzing: boolean
  analysisStage: AnalysisStage

  // Audio feedback state
  audioUrl: string | null
  isAudioPlaying: boolean
  audioCurrentTime: number
  audioDuration: number
  showAudioControls: boolean

  // Error handling with discriminated unions
  error: string | null
  analysisResult: AnalysisResult | null
  retryCount: number
}

// Video analysis actions interface
export interface VideoAnalysisActions {
  // Pose data management
  updatePoseData: (poseFrame: PoseFrame) => void

  // Analysis session management
  startAnalysis: (analysisId: string) => void
  completeAnalysis: () => void

  // Progress tracking
  setAnalysisProgress: (progress: number) => void
  setAnalysisStage: (stage: AnalysisStage) => void

  // Audio feedback management
  setAudioUrl: (url: string | null) => void
  setAudioPlaybackState: (isPlaying: boolean) => void
  setAudioCurrentTime: (time: number) => void
  setAudioDuration: (duration: number) => void
  setShowAudioControls: (show: boolean) => void
  toggleAudioControls: () => void

  // Error handling with discriminated unions
  setError: (error: string | null) => void
  setAnalysisResult: (result: AnalysisResult) => void
  retryAnalysis: () => void

  // State management
  reset: () => void
}

// Combined store interface
export interface VideoAnalysisStore extends VideoAnalysisState, VideoAnalysisActions {}

// Create the video analysis store
export const useVideoAnalysisStore = create<VideoAnalysisStore>()(
  subscribeWithSelector(
    immer(
      persist(
        (set) => ({
          // Initial state
          currentAnalysis: null,
          poseData: [],
          analysisProgress: 0,
          isAnalyzing: false,
          analysisStage: 'idle',

          // Audio feedback initial state
          audioUrl: null,
          isAudioPlaying: false,
          audioCurrentTime: 0,
          audioDuration: 0,
          showAudioControls: false,

          error: null,
          analysisResult: null,
          retryCount: 0,

          // Actions
          updatePoseData: (poseFrame: PoseFrame) => {
            set((draft) => {
              draft.poseData.push(poseFrame)

              // Limit history to prevent memory issues
              if (draft.poseData.length > MAX_POSE_HISTORY) {
                draft.poseData.shift()
              }
            })
          },

          startAnalysis: (analysisId: string) => {
            set((draft) => {
              draft.currentAnalysis = analysisId
              draft.isAnalyzing = true
              draft.analysisProgress = 0
              draft.analysisStage = 'pose-detection'
              draft.error = null
            })
          },

          completeAnalysis: () => {
            set((draft) => {
              draft.currentAnalysis = null
              draft.isAnalyzing = false
              draft.analysisProgress = 100
              draft.analysisStage = 'completed'
            })
          },

          setAnalysisProgress: (progress: number) => {
            set((draft) => {
              draft.analysisProgress = progress
              draft.isAnalyzing = progress > 0 && progress < 100
            })
          },

          setAnalysisStage: (stage: AnalysisStage) => {
            set((draft) => {
              draft.analysisStage = stage
            })
          },

          // Audio feedback actions
          setAudioUrl: (url: string | null) => {
            set((draft) => {
              draft.audioUrl = url
              draft.showAudioControls = !!url
            })
          },

          setAudioPlaybackState: (isPlaying: boolean) => {
            set((draft) => {
              draft.isAudioPlaying = isPlaying
            })
          },

          setAudioCurrentTime: (time: number) => {
            set((draft) => {
              draft.audioCurrentTime = time
            })
          },

          setAudioDuration: (duration: number) => {
            set((draft) => {
              draft.audioDuration = duration
            })
          },

          setShowAudioControls: (show: boolean) => {
            set((draft) => {
              draft.showAudioControls = show
            })
          },

          toggleAudioControls: () => {
            set((draft) => {
              draft.showAudioControls = !draft.showAudioControls
            })
          },

          setError: (error: string | null) => {
            set((draft) => {
              draft.error = error
            })
          },

          setAnalysisResult: (result: AnalysisResult) => {
            set((draft) => {
              draft.analysisResult = result

              // Update error state based on result
              if (result.success) {
                draft.error = null
              } else {
                draft.error = result.error.message
              }
            })
          },

          retryAnalysis: () => {
            set((draft) => {
              const { currentAnalysis } = draft
              if (currentAnalysis) {
                draft.retryCount += 1
                draft.error = null
                draft.isAnalyzing = true
                draft.analysisProgress = 0
                draft.analysisStage = 'pose-detection'
              }
            })
          },

          reset: () => {
            set((draft) => {
              draft.currentAnalysis = null
              draft.poseData = []
              draft.analysisProgress = 0
              draft.isAnalyzing = false
              draft.analysisStage = 'idle'

              // Reset audio feedback state
              draft.audioUrl = null
              draft.isAudioPlaying = false
              draft.audioCurrentTime = 0
              draft.audioDuration = 0
              draft.showAudioControls = false

              draft.error = null
              draft.analysisResult = null
              draft.retryCount = 0
            })
          },
        }),
        {
          name: 'video-analysis-store',
          partialize: (state) => ({
            // Persist analysis session and progress
            currentAnalysis: state.currentAnalysis,
            analysisProgress: state.analysisProgress,
            analysisStage: state.analysisStage,
            retryCount: state.retryCount,
            // Persist recent pose data (last 10 frames for recovery)
            poseData: state.poseData.slice(-10),
            // Persist audio feedback state
            audioUrl: state.audioUrl,
            audioDuration: state.audioDuration,
            showAudioControls: state.showAudioControls,
          }),
        }
      )
    )
  )
)
