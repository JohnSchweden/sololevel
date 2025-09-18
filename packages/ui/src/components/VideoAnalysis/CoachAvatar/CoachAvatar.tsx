import { Image, View } from 'tamagui'

export interface CoachAvatarProps {
  size?: number
  isSpeaking?: boolean
  testID?: string
  position?: 'absolute' | 'relative' | 'static'
  bottom?: number
  right?: number
  zIndex?: number
}

export function CoachAvatar({
  size = 90,
  isSpeaking = false,
  testID = 'coach-avatar',
  position = 'absolute',
  bottom = 20,
  right = 20,
  zIndex = 0,
}: CoachAvatarProps) {
  return (
    <View
      position={position}
      bottom={bottom}
      right={right}
      zIndex={zIndex}
    >
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
        <Image
          source={require('../../../../../../apps/expo/assets/coach_avatar.png')}
          width={size * 1.15}
          height={size * 1.15}
          marginTop={-9}
          //borderRadius={size }
          testID="coach-avatar-image"
        />
      </View>
    </View>
  )
}
