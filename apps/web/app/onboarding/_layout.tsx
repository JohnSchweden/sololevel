import { Stack } from 'expo-router'

/**
 * Onboarding Layout (Web)
 * Layout for onboarding screens (voice selection, etc.)
 * Headerless to provide full-screen experience
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Set dark background to prevent white flash during navigation transitions
        contentStyle: { backgroundColor: '#363636' },
      }}
    />
  )
}
