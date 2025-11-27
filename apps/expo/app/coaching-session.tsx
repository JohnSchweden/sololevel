import { MOCK_COACHING_SESSIONS } from '@app/features/Coach/mocks/coachingSessions'
import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { Suspense } from 'react'

// Lazy load CoachScreen to reduce initial bundle size
// Coaching session is only accessed from history screen
const LazyCoachScreen = React.lazy(() =>
  import('@app/features/Coach').then((module) => ({
    default: module.CoachScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Coaching Session screen
 */
function CoachingLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="coaching-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading session..."
        testID="coaching-loading-state"
      />
    </GlassBackground>
  )
}

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
 * - Performance: Uses React.lazy() to defer code loading until route is accessed
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
    <Suspense fallback={<CoachingLoadingFallback />}>
      <LazyCoachScreen
        sessionId={sessionData.id}
        sessionTitle={sessionData.title}
        sessionDate={sessionData.date}
        initialMessages={sessionData.initialMessages}
        hasBottomNavigation={false}
      />
    </Suspense>
  )
}
