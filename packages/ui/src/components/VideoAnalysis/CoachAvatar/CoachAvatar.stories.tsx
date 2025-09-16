import { XStack, YStack } from 'tamagui'
import { CoachAvatar } from './CoachAvatar'

export default {
  title: 'VideoAnalysis/CoachAvatar',
  component: CoachAvatar,
  parameters: {
    layout: 'centered',
  },
}

export const Default = () => <CoachAvatar />

export const CustomSize = () => <CoachAvatar size={48} />

export const Speaking = () => <CoachAvatar isSpeaking={true} />

export const InFeedbackBubble = () => (
  <XStack
    alignItems="flex-start"
    gap="$2"
  >
    <CoachAvatar size={32} />
    <YStack
      backgroundColor="$blue9"
      borderColor="$blue8"
      borderWidth={1}
      padding="$3"
      paddingRight="$4"
      borderRadius="$4"
      maxWidth={250}
    >
      Great posture! Keep your shoulders back and maintain that form.
    </YStack>
  </XStack>
)

export const InAudioOverlay = () => (
  <YStack
    backgroundColor="rgba(0,0,0,0.8)"
    borderRadius="$4"
    padding="$3"
    alignItems="center"
    gap="$2"
  >
    <CoachAvatar
      size={40}
      isSpeaking={true}
    />
    <XStack gap="$2">
      {/* Mock audio controls */}
      <YStack
        width={36}
        height={36}
        backgroundColor="$white"
        borderRadius="$1"
      />
      <YStack
        width={44}
        height={44}
        backgroundColor="$primary"
        borderRadius="$2"
      />
      <YStack
        width={36}
        height={36}
        backgroundColor="$white"
        borderRadius="$1"
      />
    </XStack>
  </YStack>
)
