import { useCallback, useEffect, useMemo, useState } from 'react'

import { BlurView } from 'expo-blur'
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { Spinner, Text, YStack } from 'tamagui'

import type { AnalysisPhase } from '../hooks/useAnalysisState'
import { useAnalysisSubscriptionStore } from '../stores/analysisSubscription'

interface ProcessingIndicatorProps {
  phase: AnalysisPhase
  progress: {
    upload: number
    analysis: number
    feedback: number
  }
  subscription: {
    key: string | null
    shouldSubscribe: boolean
  }
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

export function ProcessingIndicator({ phase, subscription }: ProcessingIndicatorProps) {
  const effectiveKey = useMemo(
    () => (subscription.shouldSubscribe ? subscription.key : null),
    [subscription.key, subscription.shouldSubscribe]
  )

  const selectChannelExhausted = useCallback(
    (state: ReturnType<typeof useAnalysisSubscriptionStore.getState>) => {
      if (!effectiveKey) {
        return false
      }

      const entry = state.subscriptions.get(effectiveKey)
      if (!entry) {
        return false
      }

      // Check if job exists (via jobId) but subscription is not active
      const jobId = entry.jobId ?? null
      const isActive = entry.status === 'active'

      return Boolean(jobId && !isActive)
    },
    [effectiveKey]
  )

  const channelExhausted = useAnalysisSubscriptionStore(selectChannelExhausted)

  const isProcessing = phase !== 'ready' && phase !== 'error'
  const blurIntensity = useSharedValue(isProcessing ? 40 : 0)
  const contentOpacity = useSharedValue(isProcessing ? 1 : 0)
  const [currentIntensity, setCurrentIntensity] = useState(isProcessing ? 40 : 0)
  const [showContent, setShowContent] = useState(isProcessing)

  // Animate blur intensity and content opacity when processing state changes
  useEffect(() => {
    if (isProcessing) {
      // Fade in blur and content when processing starts
      blurIntensity.value = withTiming(40, { duration: 300 })
      contentOpacity.value = withTiming(1, { duration: 300 })
      setShowContent(true)
    } else {
      // Fade out blur and content when processing completes
      blurIntensity.value = withTiming(0, { duration: 600 })
      contentOpacity.value = withTiming(0, { duration: 600 })
    }
  }, [isProcessing, blurIntensity, contentOpacity])

  // Sync SharedValue to state for BlurView intensity prop
  useAnimatedReaction(
    () => blurIntensity.value,
    (intensity) => {
      runOnJS(setCurrentIntensity)(intensity)
      // Hide content after blur has faded out
      if (intensity <= 0) {
        runOnJS(setShowContent)(false)
      }
    }
  )

  // Animated style for blur opacity
  const blurAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: blurIntensity.value > 0 ? 1 : 0,
    }
  })

  // Animated style for content (spinner + text) opacity
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    }
  })

  return (
    <YStack
      pointerEvents="none"
      position="absolute"
      inset={0}
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
    >
      {/* Blur background overlay - always rendered, fades out */}
      {showContent && (
        <AnimatedBlurView
          intensity={currentIntensity}
          tint="dark"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            blurAnimatedStyle,
          ]}
        />
      )}

      {showContent && (
        <Animated.View style={contentAnimatedStyle}>
          <YStack
            testID="processing-indicator"
            alignItems="center"
            justifyContent="center"
            gap="$4"
            pointerEvents="none"
          >
            <YStack
              width={60}
              height={60}
              alignItems="center"
              justifyContent="center"
              testID="processing-spinner"
              accessibilityLabel="Processing spinner"
              accessibilityRole="progressbar"
              accessibilityState={{ busy: true }}
            >
              {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
              <Spinner
                size="large"
                color="$color12"
              />
            </YStack>
            <Text
              fontSize="$4"
              fontWeight="600"
              color="white"
              textAlign="center"
              accessibilityLabel="Processing video analysis"
            >
              Analysing video...
            </Text>
            <Text
              fontSize="$4"
              fontWeight="600"
              color="white"
              textAlign="center"
            >
              This too shall pass.
            </Text>
          </YStack>
        </Animated.View>
      )}

      {channelExhausted && (
        <YStack
          testID="channel-warning"
          marginTop={8}
          padding={8}
          backgroundColor="#f97316"
          borderRadius={8}
        >
          <Text
            color="white"
            fontSize="$2"
          >
            Connection unstable
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
