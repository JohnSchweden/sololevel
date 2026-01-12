import { Provider } from '@app/provider'
import { ErrorBoundary } from '@ui/components/ErrorBoundary'
import { Stack } from 'expo-router'
import React from 'react'
import { AuthGate } from '../components/AuthGate'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Provider>
        <AuthGate>
          <Stack>
            {/* Auth routes - public (not protected) */}
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
              }}
            />

            {/* Onboarding routes - public (not protected) */}
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
              }}
            />

            {/* Tabs Layout - Main app navigation */}
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            {/* Modal routes - outside tabs */}
            <Stack.Screen
              name="video-analysis"
              options={{
                title: 'Video Analysis',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="history-progress"
              options={{
                title: 'History & Progress',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Settings',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/account"
              options={{
                title: 'Account',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/personalisation"
              options={{
                title: 'Personalisation',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/give-feedback"
              options={{
                title: 'Give Feedback',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/security"
              options={{
                title: 'Security',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/data-controls"
              options={{
                title: 'Data Controls',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings/about"
              options={{
                title: 'About',
                headerShown: false,
              }}
            />
          </Stack>
        </AuthGate>
      </Provider>
    </ErrorBoundary>
  )
}
