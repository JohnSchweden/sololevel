// No need to import React explicitly with automatic JSX runtime
import { CameraRecordingScreen } from 'app/features/CameraRecording'
import { Stack } from 'expo-router'
export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Camera Recording',
          headerShown: false, // Hide header for full-screen camera experience
        }}
      />
      <CameraRecordingScreen />
    </>
  )
}
