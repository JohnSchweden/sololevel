import { Provider } from '@app/provider'
import { ErrorBoundary } from '@ui/components/ErrorBoundary'
import { Stack } from 'expo-router'
import React from 'react'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Provider>
        <Stack>
          {/* Auth routes - public */}
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
            }}
          />

          {/* Protected routes */}
          <Stack.Screen
            name="index"
            options={{
              title: 'SoloLevel - AI Coach',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="video-analysis"
            options={{
              title: 'Video Analysis',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="coach"
            options={{
              title: 'Coach AI',
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
      </Provider>
    </ErrorBoundary>
  )
}
