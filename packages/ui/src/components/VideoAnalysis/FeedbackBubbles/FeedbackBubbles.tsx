import { Pressable } from 'react-native'
import { Text, YStack } from 'tamagui'

// Types imported from VideoPlayer.tsx
interface FeedbackMessage {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  position: { x: number; y: number }
  isHighlighted: boolean
  isActive: boolean
}

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
  onBubbleTap: (message: FeedbackMessage) => void
}

export function FeedbackBubbles({ messages, onBubbleTap }: FeedbackBubblesProps) {
  // Filter messages to show (limit to prevent overcrowding)
  const visibleMessages = messages.slice(-3) // Show last 3 messages

  return (
    <YStack
      position="absolute"
      bottom={100}
      right={20}
      gap="$3"
      pointerEvents="auto"
      testID="feedback-bubbles"
    >
      {visibleMessages.map((message) => (
        <Pressable
          key={message.id}
          onPress={() => onBubbleTap(message)}
          testID={`feedback-bubble-${message.id}`}
        >
          <YStack
            backgroundColor="$color3"
            padding="$3"
            borderRadius="$3"
            maxWidth={200}
            opacity={message.isActive ? 1 : 0.7}
            scale={message.isHighlighted ? 1.05 : 1}
            testID={`bubble-content-${message.id}`}
          >
            <Text
              fontSize="$4"
              color="$color12"
              fontWeight={message.isHighlighted ? '600' : '400'}
              testID={`bubble-text-${message.id}`}
            >
              {message.text}
            </Text>
          </YStack>
        </Pressable>
      ))}
    </YStack>
  )
}
