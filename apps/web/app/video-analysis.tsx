import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import {
  usePersistentProgressStore,
  useVideoPlayerStore,
} from '@my/app/features/VideoAnalysis/stores'
import { useFeedbackAudioStore } from '@my/app/features/VideoAnalysis/stores/feedbackAudio'
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

  const resetPlaybackStores = (reason: string) => {
    log.debug('VideoAnalysis', '🧹 Resetting playback stores', { reason, analysisJobId })
    useFeedbackCoordinatorStore.getState().reset()
    useVideoPlayerStore.getState().reset()
    useFeedbackAudioStore.getState().reset()
    usePersistentProgressStore.getState().reset()
  }

  // Reset feedback coordinator store synchronously if we haven't for this analysis
  if (lastResetAnalysisIdRef.current !== analysisJobId) {
    log.debug('VideoAnalysis', '🔄 Initialising playback stores for new video analysis', {
      analysisJobId,
      lastReset: lastResetAnalysisIdRef.current,
    })
    resetPlaybackStores('analysis-change')
    lastResetAnalysisIdRef.current = analysisJobId
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetPlaybackStores('unmount')
    }
  }, [analysisJobId])

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
