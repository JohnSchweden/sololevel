import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { useVideoPlayerStore } from '@my/app/features/VideoAnalysis/stores'
import { useFeedbackCoordinatorStore } from '@my/app/features/VideoAnalysis/stores/feedbackCoordinatorStore'
import { log } from '@my/logging'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'

/**
 * Video Analysis Route (Web)
 *
 * Supports two modes:
 * 1. Live analysis: /video-analysis?videoUri=...&videoRecordingId=...
 * 2. History mode: /video-analysis?analysisJobId=...
 *
 * Route: /video-analysis
 * Auth: Protected (requires authentication)
 */
export default function VideoAnalysis() {
  const router = useRouter()
  const { videoUri, videoRecordingId, analysisJobId } = useLocalSearchParams<{
    videoUri?: string
    videoRecordingId?: string
    analysisJobId?: string
  }>()

  // Track which analysisJobId we've reset for to avoid duplicate resets
  const lastResetAnalysisIdRef = useRef<string | undefined>(undefined)

  // Reset feedback coordinator store synchronously if we haven't for this analysis
  if (lastResetAnalysisIdRef.current !== analysisJobId) {
    log.debug('VideoAnalysis', '🔄 Resetting feedback coordinator store for new video analysis', {
      analysisJobId,
      lastReset: lastResetAnalysisIdRef.current,
    })
    useFeedbackCoordinatorStore.getState().reset()
    useVideoPlayerStore.getState().reset()
    lastResetAnalysisIdRef.current = analysisJobId
  }

  const handleBack = () => {
    log.info('VideoAnalysis', '🔙 Navigate back')
    router.back()
  }

  return (
    <VideoAnalysisScreen
      analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
      videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
      videoUri={videoUri}
      onBack={handleBack}
    />
  )
}
