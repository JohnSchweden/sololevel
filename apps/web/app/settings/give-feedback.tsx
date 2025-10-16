import { GiveFeedbackScreen } from '@my/app/features/GiveFeedback'
import { useRouter } from 'expo-router'
import Head from 'expo-router/head'
import type React from 'react'
import { AuthGate } from '../../components/AuthGate'

/**
 * Give Feedback Route (Web)
 *
 * Screen for users to submit feedback about the app.
 */
export default function GiveFeedbackRoute(): React.JSX.Element {
  const router = useRouter()

  const handleSuccess = (): void => {
    // TODO: Show success toast
    router.back()
  }

  return (
    <>
      <Head>
        <title>Give Feedback - Solo:Level</title>
        <meta
          name="description"
          content="Submit feedback, report bugs, or share suggestions for Solo:Level"
        />
      </Head>

      <AuthGate>
        <GiveFeedbackScreen onSuccess={handleSuccess} />
      </AuthGate>
    </>
  )
}
