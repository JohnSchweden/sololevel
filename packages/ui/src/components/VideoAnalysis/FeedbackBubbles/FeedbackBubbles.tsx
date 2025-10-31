import { useAnimationCompletion } from '@ui/hooks/useAnimationCompletion'
import { useFrameDropDetection } from '@ui/hooks/useFrameDropDetection'
import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { useSmoothnessTracking } from '@ui/hooks/useSmoothnessTracking'
import { BlurView } from 'expo-blur'
import { AnimatePresence, Text, YStack } from 'tamagui'
import type { FeedbackMessage } from '../types'

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
}

function SpeechBubble({ message }: { message: FeedbackMessage }) {
  // Performance tracking: Track opacity and scale animations
  // Tamagui animations are declarative, so we track state transitions
  const targetOpacity = message.isActive ? 1 : 0.7
  const targetScale = message.isHighlighted ? 1.05 : 1

  // Track opacity animation completion (Tamagui "quick" animation = ~200ms)
  const opacityCompletion = useAnimationCompletion({
    currentValue: targetOpacity,
    targetValue: targetOpacity,
    estimatedDuration: 200,
    componentName: 'FeedbackBubbles',
    animationName: `bubble-opacity-${message.id}`,
    direction: message.isActive ? 'fade-in' : 'fade-out',
  })

  // Track scale animation completion
  const scaleCompletion = useAnimationCompletion({
    currentValue: targetScale,
    targetValue: targetScale,
    estimatedDuration: 200,
    componentName: 'FeedbackBubbles',
    animationName: `bubble-scale-${message.id}`,
    direction: message.isHighlighted ? 'scale-up' : 'scale-down',
  })

  // Track smoothness from duration measurements (intentionally unused return values)
  void useSmoothnessTracking({
    duration: opacityCompletion.actualDuration,
    componentName: 'FeedbackBubbles',
    animationName: `bubble-opacity-${message.id}`,
  })

  void useSmoothnessTracking({
    duration: scaleCompletion.actualDuration,
    componentName: 'FeedbackBubbles',
    animationName: `bubble-scale-${message.id}`,
  })

  // Track frame drops during animations
  void useFrameDropDetection({
    isActive: message.isActive || message.isHighlighted,
    componentName: 'FeedbackBubbles',
    animationName: `bubble-${message.id}`,
  })

  // const getBlurTint = () => {
  //   // Use different blur tints for different message types
  //   switch (message.type) {
  //     case 'positive':
  //       return 'light' as const
  //     case 'suggestion':
  //       return 'light' as const
  //     case 'correction':
  //       return 'light' as const
  //     default:
  //       return 'light' as const
  //   }
  // }

  // const getBubbleBackgroundColor = () => {
  //   // Subtle tinted overlay on top of blur
  //   switch (message.type) {
  //     case 'positive':
  //       return 'rgba(34, 197, 94, 0)' // transparent green
  //     case 'suggestion':
  //       return 'rgba(59, 130, 246, 0)' // transparent blue
  //     case 'correction':
  //       return 'rgba(239, 68, 68, 0)' // transparent red
  //     default:
  //       return 'rgba(107, 114, 128, 0)' // transparent gray
  //   }
  // }

  return (
    <YStack
      testID={`feedback-bubble-${message.id}`}
      accessibilityLabel={`Feedback: ${message.type} feedback bubble`}
    >
      {/* Feedback Bubble */}
      <YStack
        position="relative"
        borderColor="rgba(255, 255, 255, 0.3)"
        borderWidth={1}
        borderRadius="$6"
        maxWidth={280}
        opacity={message.isActive ? 1 : 0.7}
        scale={message.isHighlighted ? 1.05 : 1}
        overflow="hidden"
        elevation={3}
        animation="quick"
        testID={`bubble-text-container-${message.id}`}
      >
        {/* Blur background layer */}
        <BlurView
          intensity={15}
          tint="light"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {/* Text content */}
        <YStack
          padding="$3"
          zIndex={1}
        >
          <Text
            fontSize="$4"
            color="white"
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
    </YStack>
  )
}

export function FeedbackBubbles({ messages }: FeedbackBubblesProps) {
  // Performance tracking: Render profile
  const hasActiveMessages = messages.some((msg) => msg.isActive || msg.isHighlighted)
  useRenderProfile({
    componentName: 'FeedbackBubbles',
    enabled: __DEV__,
    logInterval: 20,
    trackProps: {
      messageCount: messages.length,
      activeCount: messages.filter((m) => m.isActive).length,
      highlightedCount: messages.filter((m) => m.isHighlighted).length,
    },
  })

  // Track frame drops for container animations
  void useFrameDropDetection({
    isActive: hasActiveMessages,
    componentName: 'FeedbackBubbles',
    animationName: 'container',
  })

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

  return (
    <AnimatePresence>
      {visibleMessages.length > 0 && (
        <YStack
          key="feedback-bubbles-container"
          position="absolute"
          bottom={120} // Position below video controls (controls are at bottom={80})
          left={20}
          right={20}
          zIndex={0}
          pointerEvents="box-none"
          testID="feedback-bubbles"
          accessibilityLabel="Feedback bubbles container"
          animation="quick"
          exitStyle={{
            opacity: 0,
            y: 20,
          }}
        >
          <YStack
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="center"
            gap="$2"
            pointerEvents="auto"
          >
            <AnimatePresence>
              {visibleMessages.map((message) => (
                <YStack
                  key={message.id}
                  zIndex={message.isHighlighted ? 10 : 5}
                  scale={message.isHighlighted ? 1.05 : 1}
                  animation="quick"
                  enterStyle={{
                    opacity: 0,
                    scale: 0.8,
                    y: 20,
                  }}
                  testID={`bubble-position-${message.id}`}
                >
                  <SpeechBubble message={message} />
                </YStack>
              ))}
            </AnimatePresence>
          </YStack>
        </YStack>
      )}
    </AnimatePresence>
  )
}
