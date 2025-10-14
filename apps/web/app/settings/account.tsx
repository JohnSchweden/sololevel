import { GlassBackground } from '@my/ui'
import { useRouter } from 'expo-router'
import { Text, YStack } from 'tamagui'

/**
 * Account Settings Screen (P1 Placeholder)
 */
export default function AccountSettingsRoute() {
  const router = useRouter()

  return (
    <GlassBackground backgroundColor="$color3">
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$6"
      >
        <Text
          fontSize="$8"
          fontWeight="600"
          color="$color12"
          marginBottom="$4"
        >
          Account Settings
        </Text>
        <Text
          fontSize="$5"
          color="$gray11"
          textAlign="center"
          marginBottom="$6"
        >
          Coming soon: Manage your account details, email, and password.
        </Text>
        <Text
          fontSize="$4"
          color="$primary"
          onPress={() => router.back()}
          cursor="pointer"
        >
          ← Back to Settings
        </Text>
      </YStack>
    </GlassBackground>
  )
}
