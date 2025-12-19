import { useCallback, useEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { BlurView, StateDisplay } from '@my/ui'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { Text, YStack } from 'tamagui'

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

/**
 * ProcessingIndicator - Fullscreen overlay that blocks all user interactions during video analysis
 *
 * **Interaction Blocking:**
 * - When `isProcessing=true`: `pointerEvents="auto"` captures and blocks ALL touch events
 * - When `isProcessing=false`: `pointerEvents="none"` allows touches to pass through
 * - Positioned at `zIndex={1000}` to overlay above all screen content
 * - Covers entire screen (`inset={0}`) to intercept gestures anywhere
 *
 * **Visual Feedback:**
 * - Blur overlay (static intensity 40) with dark tint, animated opacity
 * - Spinner with "Analysing video..." message
 * - Fade in/out animations (300ms in, 600ms out)
 *
 * **Processing States (from AnalysisPhase):**
 * - 'uploading' | 'analyzing' | 'generating-feedback' → blocking enabled
 * - 'ready' | 'error' → blocking disabled
 *
 * @param phase - Current analysis phase determines blocking state
 * @param subscription - Subscription metadata for connection status
 */
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
  // FIX: expo-blur doesn't support animated props - use static intensity with animated opacity
  const overlayOpacity = useSharedValue(isProcessing ? 1 : 0)

  // Animate overlay opacity when processing state changes
  useEffect(() => {
    if (isProcessing) {
      // Fade in blur and content when processing starts
      overlayOpacity.value = withTiming(1, { duration: 300 })
    } else {
      // Fade out blur and content when processing completes
      overlayOpacity.value = withTiming(0, { duration: 600 })
    }
  }, [isProcessing, overlayOpacity])

  // Animated style for blur overlay opacity
  const blurAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    }
  })

  // Animated style for content (spinner + text) opacity
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    }
  })

  return (
    <YStack
      pointerEvents={isProcessing ? 'auto' : 'none'}
      position="absolute"
      inset={0}
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      testID={isProcessing ? 'processing-blocker' : undefined}
      accessibilityLabel={isProcessing ? 'Processing overlay - interactions blocked' : undefined}
    >
      {/* Blur background overlay - blocks all interactions when processing */}
      {/* FIX: expo-blur doesn't support animated intensity - use static intensity with animated opacity */}
      <Animated.View
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
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={40}
            tint="dark"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        ) : (
          <YStack
            backgroundColor="rgba(0, 0, 0, 0.8)"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
      </Animated.View>

      {/* MEMORY LEAK FIX: Use opacity animation instead of conditional rendering */}
      <Animated.View
        style={[contentAnimatedStyle, { pointerEvents: isProcessing ? 'auto' : 'none' }]}
      >
        {/* <YStack
          testID="processing-indicator"
          alignItems="center"
          justifyContent="center"
          gap="$6"
          pointerEvents="none"
        >
          <YStack
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            testID="processing-spinner"
            accessibilityLabel="Processing spinner"
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
          >
            {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
        {/* <Spinner
              size="small"
              color="$color12"
            />
          </YStack>
          <Text
            fontSize="$4"
            fontWeight="400"
            color="$color12"
            textAlign="center"
            accessibilityLabel="Processing video analysis"
          >
            Wait a sec, will ya.
          </Text>
          <Text
            fontSize="$4"
            fontWeight="400"
            color="$color12"
            textAlign="center"
          >
            I'm checking your choreography...
          </Text>
        </YStack> */}
        <StateDisplay
          type="loading"
          title="Analysing video..."
          description="This too shall pass. 😌"
          testID="processing-indicator"
          // containerProps={{
          //   pointerEvents: 'none',
          //   gap: '$6',
          // }}
        />
      </Animated.View>

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
