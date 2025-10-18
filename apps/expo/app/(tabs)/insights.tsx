import { InsightsScreen } from '@app/features/Insights'

/**
 * Insights Tab - Performance insights and progress tracking
 *
 * Route: /(tabs)/insights
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 */
export default function InsightsTab() {
  return <InsightsScreen />
}
