import { UserDetailScreen } from 'app/features/user/detail-screen'
import { Stack, useRouter } from 'expo-router'
import { useLocalSearchParams } from 'expo-router'

export default function Screen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()

  return (
    <>
      <Stack.Screen
        options={{
          title: 'User',
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
      <UserDetailScreen
        id={id as string}
        onGoBack={() => router.back()}
      />
    </>
  )
}
