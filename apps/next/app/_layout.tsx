import { Provider } from '@app/provider'
import { Stack } from 'expo-router'
import React from 'react'

export default function RootLayout() {
  return (
    <Provider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'SoloLevel - AI Coach',
            headerShown: false,
          }}
        />
      </Stack>
    </Provider>
  )
}
