import { GlassBackground } from '@my/ui'
import { useRouter } from 'expo-router'
import { Text, YStack } from 'tamagui'

export default function AboutSettingsRoute() {
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
          About
        </Text>
        <Text
          fontSize="$5"
          color="$gray11"
          textAlign="center"
          marginBottom="$6"
        >
          Solo:Level AI Feedback Coach{'\n'}Version 1.0.0
        </Text>
        <Text
          fontSize="$4"
          color="$gray10"
          textAlign="center"
          marginBottom="$6"
        >
          © 2025 Solo:Level. All rights reserved.
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
