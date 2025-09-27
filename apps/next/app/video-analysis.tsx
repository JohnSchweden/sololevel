import { VideoAnalysisScreen } from '@my/app/features/VideoAnalysis/VideoAnalysisScreen'
import { AuthGate } from '../components/AuthGate'

export default function VideoAnalysis() {
  return (
    <AuthGate>
      <VideoAnalysisScreen
        analysisJobId={1} // This would come from route params in a real implementation
        onBack={() => {
          // Handle navigation back
          console.log('Navigate back')
          window.history.back()
        }}
        onMenuPress={() => {
          // Handle menu press
          console.log('Menu pressed')
        }}
      />
    </AuthGate>
  )
}
