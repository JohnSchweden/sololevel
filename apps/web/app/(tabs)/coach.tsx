import { CoachScreen } from '@app/features/Coach'
import { MOCK_COACHING_SESSIONS } from '@app/features/Coach/mocks/coachingSessions'
import { log } from '@my/logging'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect } from 'react'

/**
 * Coach Tab - AI coaching chat interface
 *
 * Route: /(tabs)/coach
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 * Header dynamically adjusted based on navigation context:
 * - Default: Menu button (navigates to history-progress)
 * - With sessionId: Back button (returns to history-progress)
 */
export default function CoachTab() {
  const router = useRouter()
  const navigation = useNavigation()
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>()

  // Load session data if sessionId is provided
  const sessionData = sessionId
    ? MOCK_COACHING_SESSIONS.find((session) => session.id === Number.parseInt(sessionId, 10))
    : null

  const handleBack = () => {
    log.info('CoachTab', 'Back button pressed - returning to history-progress')
    // Use dismissTo to go back to history-progress, which is in the navigation stack
    router.dismissTo('/history-progress')
  }

  const handleMenuPress = () => {
    log.info('CoachTab', 'Menu button pressed - navigating to history-progress')
    router.push('/history-progress')
  }

  // Set header props based on navigation context
  useLayoutEffect(() => {
    if (sessionId) {
      // History mode: show back button when navigating from HistoryProgressScreen
      navigation.setOptions({
        // @ts-ignore: custom appHeaderProps not in base type
        appHeaderProps: {
          leftAction: 'back',
          onBackPress: handleBack,
        },
      })
    } else {
      // Default mode: show menu button
      navigation.setOptions({
        // @ts-ignore: custom appHeaderProps not in base type
        appHeaderProps: {
          leftAction: 'sidesheet',
          onMenuPress: handleMenuPress,
        },
      })
    }
  }, [navigation, sessionId])

  return (
    <CoachScreen
      sessionId={sessionData?.id}
      sessionTitle={sessionData?.title}
      initialMessages={sessionData?.initialMessages}
    />
  )
}
