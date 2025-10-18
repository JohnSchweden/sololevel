import { CoachScreen } from '@app/features/Coach'

/**
 * Coach Tab - AI coaching chat interface
 *
 * Route: /(tabs)/coach
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 */
export default function CoachTab() {
  return <CoachScreen />
}
