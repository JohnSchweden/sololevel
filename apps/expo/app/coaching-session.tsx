import { CoachScreen } from '@app/features/Coach'
import { MOCK_COACHING_SESSIONS } from '@app/features/Coach/mocks/coachingSessions'
import { log } from '@my/logging'
import { useLocalSearchParams, useRouter } from 'expo-router'

/**
 * Coaching Session Route (Native)
 *
 * Dedicated route for viewing previous coaching sessions from history.
 * Bypasses tab navigation for better performance and UX.
 *
 * Route: /coaching-session?sessionId=...
 * Auth: Protected (requires authentication)
 *
 * Architecture:
 * - Stack navigation (modal route, not a tab)
 * - Reuses CoachScreen component
 * - Header configured in root _layout.tsx
 * - No tab overhead or lazy loading
 */
export default function CoachingSessionRoute() {
  const router = useRouter()
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()

  // Load session data
  const sessionData = sessionId
    ? MOCK_COACHING_SESSIONS.find((session) => session.id === Number.parseInt(sessionId, 10))
    : null

  if (!sessionId || !sessionData) {
    log.warn('CoachingSessionRoute', 'Invalid or missing session ID', { sessionId })
    // Redirect back to history if no valid session
    router.back()
    return null
  }

  log.info('CoachingSessionRoute', 'Rendering coaching session', {
    sessionId: sessionData.id,
    title: sessionData.title,
  })

  return (
    <CoachScreen
      sessionId={sessionData.id}
      sessionTitle={sessionData.title}
      sessionDate={sessionData.date}
      initialMessages={sessionData.initialMessages}
      hasBottomNavigation={false}
    />
  )
}
