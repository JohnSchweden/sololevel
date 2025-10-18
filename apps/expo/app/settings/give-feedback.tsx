import { GiveFeedbackScreen } from '@my/app/features/GiveFeedback'
import { useRouter } from 'expo-router'
import type React from 'react'

/**
 * Give Feedback Route (Native)
 *
 * Screen for users to submit feedback about the app.
 */
export default function GiveFeedbackRoute(): React.JSX.Element {
  const router = useRouter()

  const handleSuccess = (): void => {
    // TODO: Show success toast
    router.back()
  }

  return <GiveFeedbackScreen onSuccess={handleSuccess} />
}
