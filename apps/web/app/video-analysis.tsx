import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { log } from '@my/logging'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

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

  const handleBack = () => {
    log.info('VideoAnalysis', '🔙 Navigate back')
    router.back()
  }

  return (
    <AuthGate>
      <VideoAnalysisScreen
        analysisJobId={analysisJobId ? Number.parseInt(analysisJobId, 10) : undefined}
        videoRecordingId={videoRecordingId ? Number.parseInt(videoRecordingId, 10) : undefined}
        videoUri={videoUri}
        onBack={handleBack}
      />
    </AuthGate>
  )
}
