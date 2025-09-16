import { Pressable } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'
import { CoachAvatar } from '../CoachAvatar/CoachAvatar'
import type { FeedbackMessage } from '../types'

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
  onBubbleTap: (message: FeedbackMessage) => void
}

function SpeechBubble({ message, onTap }: { message: FeedbackMessage; onTap: () => void }) {
  const getBubbleColor = () => {
    switch (message.type) {
      case 'positive':
        return '$green9'
      case 'suggestion':
        return '$blue9'
      case 'correction':
        return '$orange9'
      default:
        return '$color3'
    }
  }

  const getBubbleBorderColor = () => {
    switch (message.type) {
      case 'positive':
        return '$green8'
      case 'suggestion':
        return '$blue8'
      case 'correction':
        return '$orange8'
      default:
        return '$color4'
    }
  }

  return (
    <Pressable
      onPress={onTap}
      testID={`feedback-bubble-${message.id}`}
      accessibilityLabel={`Feedback: ${message.text}`}
      accessibilityRole="button"
      accessibilityHint={`Tap to view details about ${message.category} feedback`}
      accessibilityState={{
        selected: message.isHighlighted,
        disabled: !message.isActive,
      }}
    >
      <XStack
        alignItems="flex-start"
        gap="$2"
        testID={`bubble-content-${message.id}`}
        accessibilityLabel={`${message.type} feedback bubble`}
      >
        {/* Coach Avatar */}
        <CoachAvatar
          size={32}
          testID={`bubble-avatar-${message.id}`}
        />

        {/* Speech Bubble */}
        <YStack position="relative">
          <YStack
            backgroundColor={getBubbleColor()}
            borderColor={getBubbleBorderColor()}
            borderWidth={1}
            padding="$3"
            paddingRight="$4"
            borderRadius="$4"
            maxWidth={250}
            opacity={message.isActive ? 1 : 0.7}
            scale={message.isHighlighted ? 1.05 : 1}
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            testID={`bubble-text-container-${message.id}`}
          >
            <Text
              fontSize="$4"
              color="$color1"
              fontWeight={message.isHighlighted ? '600' : '400'}
              lineHeight="$5"
              testID={`bubble-text-${message.id}`}
              accessibilityLabel={message.text}
            >
              {message.text}
            </Text>
          </YStack>

          {/* Speech Bubble Tail */}
          <View
            position="absolute"
            left={-6}
            top={12}
            width={0}
            height={0}
            borderLeftWidth={6}
            borderRightWidth={0}
            borderTopWidth={6}
            borderBottomWidth={6}
            borderLeftColor={getBubbleColor()}
            borderTopColor="transparent"
            borderBottomColor="transparent"
            testID={`bubble-tail-${message.id}`}
          />
        </YStack>
      </XStack>
    </Pressable>
  )
}

export function FeedbackBubbles({ messages, onBubbleTap }: FeedbackBubblesProps) {
  // Filter messages to show (limit to prevent overcrowding)
  // Prioritize highlighted and active messages, then show most recent
  const sortedMessages = messages
    .filter((msg) => msg.isActive)
    .sort((a, b) => {
      // Prioritize highlighted messages
      if (a.isHighlighted && !b.isHighlighted) return -1
      if (!a.isHighlighted && b.isHighlighted) return 1
      // Then sort by timestamp (most recent first)
      return b.timestamp - a.timestamp
    })

  const visibleMessages = sortedMessages.slice(0, 3) // Show up to 3 messages

  if (visibleMessages.length === 0) {
    return null
  }

  return (
    <YStack
      position="absolute"
      top={20}
      left={20}
      right={20}
      bottom={100}
      pointerEvents="box-none"
      testID="feedback-bubbles"
      accessibilityLabel="Feedback bubbles container"
    >
      {visibleMessages.map((message) => (
        <YStack
          key={message.id}
          position="absolute"
          left={`${message.position.x * 100}%`}
          top={`${message.position.y * 100}%`}
          pointerEvents="auto"
          zIndex={message.isHighlighted ? 10 : 5}
          animation="quick"
          opacity={message.isActive ? 1 : 0}
          scale={message.isHighlighted ? 1.05 : 1}
          testID={`bubble-position-${message.id}`}
        >
          <SpeechBubble
            message={message}
            onTap={() => onBubbleTap(message)}
          />
        </YStack>
      ))}
    </YStack>
  )
}
