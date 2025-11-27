import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        // Match root layout background to prevent white flash during transitions
        contentStyle: { backgroundColor: '#363636' },
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
    </Stack>
  )
}
