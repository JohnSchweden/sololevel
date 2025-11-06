import React from 'react'
import { Text, YStack } from 'tamagui'

export interface MessageBubbleProps {
  type: 'user' | 'coach'
  content: string
  timestamp: Date
  testID?: string
}

/**
 * MessageBubble component for chat messages
 *
 * Displays chat messages with different styling for user and coach
 * with timestamp in a mobile-optimized layout.
 *
 * @example
 * ```tsx
 * <MessageBubble
 *   type="user"
 *   content="How do I improve my form?"
 *   timestamp={new Date()}
 * />
 * ```
 */
const MessageBubbleComponent = ({
  type,
  content,
  timestamp,
  testID,
}: MessageBubbleProps): React.JSX.Element => {
  const isUser = type === 'user'

  // Format timestamp to HH:MM AM/PM
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <YStack
      maxWidth="80%"
      padding="$3"
      borderRadius="$4"
      overflow="hidden"
      backgroundColor={isUser ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)'}
      borderWidth={isUser ? 0 : 0.75}
      borderColor="rgba(255,255,255,0.2)"
      testID={testID}
      accessibilityLabel={`${type} message: ${content}`}
      accessibilityRole="text"
    >
      {/* Message content */}
      <Text
        fontSize="$3"
        color="$color"
        lineHeight="$3"
      >
        {content}
      </Text>

      {/* Timestamp */}
      <Text
        fontSize="$1"
        color="$color11"
        marginTop="$1"
      >
        {formatTime(timestamp)}
      </Text>
    </YStack>
  )
}
/**
 * Memoized MessageBubble to prevent re-renders when props haven't changed.
 * Uses custom comparison for Date timestamps (compares time value, not reference).
 */
export const MessageBubble = React.memo(MessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.content === nextProps.content &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.testID === nextProps.testID
  )
})
