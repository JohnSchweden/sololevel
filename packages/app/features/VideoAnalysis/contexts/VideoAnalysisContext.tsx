import { createContext, useContext } from 'react'

import type { FeedbackPanelItem } from '../types'

export interface VideoAnalysisContextValue {
  videoUri: string
  feedbackItems: FeedbackPanelItem[]
  isPullingToReveal: boolean
}

const VideoAnalysisContext = createContext<VideoAnalysisContextValue | null>(null)

export const VideoAnalysisProvider = VideoAnalysisContext.Provider

export function useVideoAnalysisContext(): VideoAnalysisContextValue {
  const context = useContext(VideoAnalysisContext)
  if (!context) {
    throw new Error('useVideoAnalysisContext must be used within VideoAnalysisProvider')
  }
  return context
}
