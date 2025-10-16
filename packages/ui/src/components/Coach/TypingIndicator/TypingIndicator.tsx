import type React from 'react'
import { useEffect, useState } from 'react'
import { XStack, YStack } from 'tamagui'

export interface TypingIndicatorProps {
  testID?: string
}

/**
 * TypingIndicator component for chat
 *
 * Displays animated bouncing dots to indicate AI is typing.
 * Three dots with staggered animation delays (0s, 0.1s, 0.2s).
 *
 * @example
 * ```tsx
 * <TypingIndicator />
 * ```
 */
export const TypingIndicator = ({
  testID = 'typing-indicator',
}: TypingIndicatorProps): React.JSX.Element => {
  const [dots, setDots] = useState([false, false, false])

  useEffect(() => {
    // Animate dots with staggered delays
    const intervals = [
      setTimeout(() => setDots([true, false, false]), 0),
      setTimeout(() => setDots([true, true, false]), 100),
      setTimeout(() => setDots([true, true, true]), 200),
    ]

    const cycleInterval = setInterval(() => {
      setDots([false, false, false])
      setTimeout(() => setDots([true, false, false]), 0)
      setTimeout(() => setDots([true, true, false]), 100)
      setTimeout(() => setDots([true, true, true]), 200)
    }, 1000)

    return () => {
      intervals.forEach(clearTimeout)
      clearInterval(cycleInterval)
    }
  }, [])

  return (
    <YStack
      maxWidth="80%"
      padding="$3"
      borderRadius="$4"
      backgroundColor="rgba(255,255,255,0.1)"
      borderWidth={1}
      borderColor="rgba(255,255,255,0.2)"
      testID={testID}
      accessibilityLabel="AI is typing"
      accessibilityRole="text"
    >
      <XStack gap="$1">
        {[0, 1, 2].map((index) => (
          <YStack
            key={index}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor="rgba(255,255,255,0.6)"
            opacity={dots[index] ? 1 : 0.3}
            animation="quick"
          />
        ))}
      </XStack>
    </YStack>
  )
}
