import { User } from '@tamagui/lucide-icons'
import { View } from 'tamagui'

export interface CoachAvatarProps {
  size?: number
  isSpeaking?: boolean
  testID?: string
}

export function CoachAvatar({
  size = 32,
  isSpeaking = false,
  testID = 'coach-avatar',
}: CoachAvatarProps) {
  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor="$color4"
      alignItems="center"
      justifyContent="center"
      testID={testID}
      accessibilityLabel="AI Coach Avatar"
      accessibilityRole="image"
      data-testid={isSpeaking ? 'coach-avatar-speaking' : 'coach-avatar-idle'}
    >
      <User
        size={size * 0.5}
        color="$color12"
        testID="coach-avatar-icon"
      />
    </View>
  )
}
