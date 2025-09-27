import { Provider } from '@app/provider'
import { Stack } from 'expo-router'
import React from 'react'

export default function RootLayout() {
  return (
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
      </Stack>
    </Provider>
  )
}
