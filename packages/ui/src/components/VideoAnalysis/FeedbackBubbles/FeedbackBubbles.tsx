import { Text, YStack } from 'tamagui'
import type { FeedbackMessage } from '../types'

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
}

function SpeechBubble({ message }: { message: FeedbackMessage }) {
  const getBubbleBackgroundColor = () => {
    // Glassy background with transparent theme-inspired colors
    switch (message.type) {
      case 'positive':
        return 'rgba(34, 197, 94, 0.15)' // transparent green
      case 'suggestion':
        return 'rgba(59, 130, 246, 0.15)' // transparent blue
      case 'correction':
        return 'rgba(239, 68, 68, 0.15)' // transparent red
      default:
        return 'rgba(107, 114, 128, 0.15)' // transparent gray
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
    <YStack
      testID={`feedback-bubble-${message.id}`}
      accessibilityLabel={`Feedback: ${message.type} feedback bubble`}
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
        shadowColor="$color12"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.1}
        shadowRadius={6}
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
  )
}

export function FeedbackBubbles({ messages }: FeedbackBubblesProps) {
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
            <SpeechBubble message={message} />
          </YStack>
        ))}
      </YStack>
    </YStack>
  )
}
