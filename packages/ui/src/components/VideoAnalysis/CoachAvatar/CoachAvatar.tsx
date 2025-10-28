import { BlurView } from 'expo-blur'
import { Image, View } from 'tamagui'

export interface CoachAvatarProps {
  size?: number
  isSpeaking?: boolean
  testID?: string
  position?: 'absolute' | 'relative' | 'static'
  bottom?: number
  right?: number
  zIndex?: number
  animation?: any
  enterStyle?: any
  exitStyle?: any
}

export function CoachAvatar({
  size = 90,
  isSpeaking = false,
  testID = 'coach-avatar',
  position = 'absolute',
  bottom = 70,
  right = 20,
  zIndex = 0,
  animation,
  enterStyle,
  exitStyle,
}: CoachAvatarProps) {
  return (
    <View
      position={position}
      bottom={bottom}
      right={right}
      zIndex={zIndex}
      animation={animation}
      enterStyle={enterStyle}
      exitStyle={exitStyle}
    >
      <BlurView
        intensity={15}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          width={size}
          height={size}
          borderRadius={size / 2}
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
            testID="coach-avatar-image"
          />
        </View>
      </BlurView>
    </View>
  )
}
