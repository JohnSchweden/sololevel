import { Pressable } from 'react-native'
import { Text, YStack } from 'tamagui'
import type { FeedbackMessage } from '../types'

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
  onBubbleTap: (message: FeedbackMessage) => void
}

function SpeechBubble({ message, onTap }: { message: FeedbackMessage; onTap: () => void }) {
  const getBubbleBackgroundColor = () => {
    // Glassy background with different opacities based on message type
    switch (message.type) {
      case 'positive':
        return 'rgba(34, 197, 94, 0.15)' // green with low opacity
      case 'suggestion':
        return 'rgba(59, 130, 246, 0.15)' // blue with low opacity
      case 'correction':
        return 'rgba(245, 101, 101, 0.15)' // red with low opacity
      default:
        return 'rgba(75, 85, 99, 0.15)' // gray with low opacity
    }
  }

  const getTextColor = () => {
    // Brighter text colors for better contrast on glassy background
    switch (message.type) {
      case 'positive':
        return '$green11'
      case 'suggestion':
        return '$blue11'
      case 'correction':
        return '$red11'
      default:
        return '$color12'
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
      <YStack
        testID={`bubble-content-${message.id}`}
        accessibilityLabel={`${message.type} feedback bubble`}
      >
        {/* Feedback Bubble */}
        <YStack
          backgroundColor={getBubbleBackgroundColor()}
          borderColor="$color12" // Thin white border
          borderWidth={1}
          padding="$3"
          borderRadius="$6"
          maxWidth={280}
          opacity={message.isActive ? 1 : 0.7}
          scale={message.isHighlighted ? 1.05 : 1}
          // Glassy blur effect using backdrop-filter style
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)', // Safari support
          }}
          // Enhanced shadow for glassy effect
          shadowColor="rgba(0, 0, 0, 0.1)"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
          shadowRadius={8}
          // Soft animation effects
          animation="quick"
          enterStyle={{
            opacity: 0,
            scale: 0.8,
          }}
          exitStyle={{
            opacity: 0,
            scale: 0.8,
          }}
          testID={`bubble-text-container-${message.id}`}
        >
          <Text
            fontSize="$4"
            color={getTextColor()}
            fontWeight={message.isHighlighted ? '600' : '400'}
            lineHeight="$5"
            textAlign="center"
            testID={`bubble-text-${message.id}`}
            accessibilityLabel={message.text}
          >
            {message.text}
          </Text>
        </YStack>
      </YStack>
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
      bottom={120} // Position below video controls (controls are at bottom={80})
      left={20}
      right={20}
      zIndex={0}
      pointerEvents="box-none"
      testID="feedback-bubbles"
      accessibilityLabel="Feedback bubbles container"
    >
      <YStack
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="center"
        gap="$2"
        pointerEvents="auto"
      >
        {visibleMessages.map((message) => (
          <YStack
            key={message.id}
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
    </YStack>
  )
}
