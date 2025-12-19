import { useAnimationCompletion } from '@ui/hooks/useAnimationCompletion'
import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { useSmoothnessTracking } from '@ui/hooks/useSmoothnessTracking'
import { memo, useMemo } from 'react'
import { Platform } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withTiming,
  Easing,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { BlurView } from '../../BlurView/BlurView'

import { Text, YStack } from 'tamagui'
import type { FeedbackMessage } from '../types'

// Memoized BlurView style (static, reused across all bubbles)
const BLUR_VIEW_STYLE = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
}

export interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
  collapseProgress?: SharedValue<number> // 0 = max mode, 1 = collapsed
}

/**
 * SpeechBubble - Memoized bubble with Reanimated animations
 *
 * PERFORMANCE: Replaced Tamagui animations with Reanimated to eliminate
 * JS bridge saturation during gesture-driven layout animations.
 * All animations now run on UI thread.
 */
const SpeechBubble = memo(function SpeechBubble({ message }: { message: FeedbackMessage }) {
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

  // Reanimated style for opacity and scale (replaces Tamagui animation)
  const animatedStyle = useAnimatedStyle(() => {
    const targetOpacity = message.isActive ? 1 : 0.7
    const targetScale = message.isHighlighted ? 1.05 : 1

    return {
      opacity: withTiming(targetOpacity, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      }),
      transform: [
        {
          scale: withTiming(targetScale, {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          }),
        },
      ],
    }
  }, [message.isActive, message.isHighlighted])

  return (
    <Animated.View
      style={[
        {
          position: 'relative',
          borderRadius: 14,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderWidth: 1,
          maxWidth: 280,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      testID={`feedback-bubble-${message.id}`}
    >
      {/* Blur background layer */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={15}
          tint="light"
          style={BLUR_VIEW_STYLE}
        />
      ) : (
        <YStack
          backgroundColor="rgba(255, 255, 255, 0.15)"
          style={BLUR_VIEW_STYLE}
        />
      )}
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
    </Animated.View>
  )
})

/**
 * FeedbackBubbles - Memoized container with Reanimated animations
 *
 * PERFORMANCE: Replaced Tamagui AnimatePresence + animation with Reanimated
 * entering/exiting animations. All animations now run on UI thread with no
 * JS bridge saturation.
 */
export const FeedbackBubbles = memo(function FeedbackBubbles({
  messages,
  collapseProgress,
}: FeedbackBubblesProps) {
  // Performance tracking: Render profile
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

  // Compute bottom value based on max mode (collapseProgress <= 0.1)
  const bottomValue = useDerivedValue(() => {
    if (!collapseProgress) {
      return 100 // Default to max mode bottom if collapseProgress not provided
    }
    return collapseProgress.value <= 0.1 ? 110 : 70
  }, [collapseProgress])

  // MEMORY LEAK FIX: Use animated style directly instead of syncing to state via runOnJS
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      bottom: bottomValue.value,
    }
  }, [bottomValue])

  // Filter messages to show (limit to prevent overcrowding)
  // Prioritize highlighted and active messages, then show most recent
  // Memoize to prevent recalculation during parent re-renders
  const visibleMessages = useMemo(() => {
    const sorted = messages
      .filter((msg) => msg.isActive)
      .sort((a, b) => {
        // Prioritize highlighted messages
        if (a.isHighlighted && !b.isHighlighted) return -1
        if (!a.isHighlighted && b.isHighlighted) return 1
        // Then sort by timestamp (most recent first)
        return b.timestamp - a.timestamp
      })
    return sorted.slice(0, 3) // Show up to 3 messages
  }, [messages])

  if (visibleMessages.length === 0) {
    return null
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        {
          position: 'absolute',
          left: 20,
          right: 20,
          zIndex: 0,
          pointerEvents: 'box-none',
        },
        containerAnimatedStyle,
      ]}
      testID="feedback-bubbles"
    >
      <YStack
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="center"
        gap="$2"
        pointerEvents="auto"
      >
        {visibleMessages.map((message) => (
          <Animated.View
            key={message.id}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              zIndex: message.isHighlighted ? 10 : 5,
            }}
            testID={`bubble-position-${message.id}`}
          >
            <SpeechBubble message={message} />
          </Animated.View>
        ))}
      </YStack>
    </Animated.View>
  )
})

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(FeedbackBubbles as any).whyDidYouRender = true
}
