import { CoachScreen } from '@app/features/Coach'
import { AuthGate } from '../../components/AuthGate'

/**
 * Coach Tab - AI coaching chat interface
 *
 * Route: /(tabs)/coach
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 */
export default function CoachTab() {
  return (
    <AuthGate>
      <CoachScreen />
    </AuthGate>
  )
}
