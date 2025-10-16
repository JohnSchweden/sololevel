import { BlurView } from 'expo-blur'
import type React from 'react'
import { Text } from 'tamagui'

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
export const MessageBubble = ({
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
    <BlurView
      intensity={isUser ? 20 : 15}
      tint="light"
      style={{
        maxWidth: '80%',
        padding: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: isUser ? 0 : 1,
        borderColor: isUser ? 'transparent' : 'rgba(255,255,255,0.2)',
      }}
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
    </BlurView>
  )
}
