import { DemoScreen } from 'app/features/demo/demo-screen'
import { Stack } from 'expo-router'

export default function DemoPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Demo & Testing',
          headerShown: true,
        }}
      />
      <DemoScreen />
    </>
  )
}
