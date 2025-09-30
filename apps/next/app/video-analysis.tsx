import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { log } from '@my/logging'
import { AuthGate } from '../components/AuthGate'

export default function VideoAnalysis() {
  return (
    <AuthGate>
      <VideoAnalysisScreen
        analysisJobId={1} // This would come from route params in a real implementation
        onBack={() => {
          // Handle navigation back
          log.info('VideoAnalysis', '🔙 Navigate back')
          window.history.back()
        }}
        onMenuPress={() => {
          // Handle menu press
          log.info('VideoAnalysis', '🎛️ Menu pressed')
        }}
      />
    </AuthGate>
  )
}
