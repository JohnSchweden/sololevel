import { memo, useCallback, useEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { BlurView } from '@my/ui'
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { Spinner, Text, XStack, YStack } from 'tamagui'

import type { AnalysisPhase } from '../hooks/useAnalysisState'
import { useAnalysisSubscriptionStore } from '../stores/analysisSubscription'

// =============================================================================
// 3-Step Progress Config
// =============================================================================

const STEPS = [
  { key: 'upload', label: 'Waking up the AI bunnies 🐰' },
  { key: 'analyze', label: 'Finding your mistakes 🔍' },
  { key: 'roast', label: 'Giving it a voice 🎤' },
] as const

type StepKey = (typeof STEPS)[number]['key']

// Module-level style constants to avoid object allocation on every render
const STEP_2_TRANSFORM = { transform: [{ translateX: -8 }] } as const
const STEP_3_TRANSFORM = { transform: [{ translateX: -8 }] } as const

/**
 * Maps AnalysisPhase → step index (0, 1, 2)
 */
function getStepFromPhase(phase: AnalysisPhase): { stepIndex: number; stepKey: StepKey } {
  if (phase === 'uploading' || phase === 'upload-complete') {
    return { stepIndex: 0, stepKey: 'upload' }
  }
  if (phase === 'analyzing') {
    return { stepIndex: 1, stepKey: 'analyze' }
  }
  // generating-feedback, ready, error → step 3
  return { stepIndex: 2, stepKey: 'roast' }
}

/**
 * Calculate overall progress (0-100) from phase
 * - uploading: 0%
 * - analyzing: 33.33%
 * - generating-feedback: 66.66%
 * - ready: 100%
 */
function getOverallProgress(phase: AnalysisPhase): number {
  if (phase === 'uploading' || phase === 'upload-complete') {
    return 0
  }
  if (phase === 'analyzing') {
    return 33.33
  }
  if (phase === 'generating-feedback') {
    return 66.66
  }
  if (phase === 'ready') {
    return 100
  }
  return 0
}

/**
 * Get title and description for current phase
 */
function getPhaseText(phase: AnalysisPhase): { title: string; description: string } {
  const { stepKey } = getStepFromPhase(phase)
  const step = STEPS.find((s) => s.key === stepKey) ?? STEPS[0]

  const descriptions: Record<StepKey, string> = {
    upload: 'Just uploading your crawling attempt.',
    analyze: "Don't worry, I've seen worse. Probably.",
    roast: 'Bringing your individual roast to live, so you learn for once.',
  }

  return {
    title: step.label + ' ...',
    description: descriptions[stepKey],
  }
}

// =============================================================================
// SteppedProgressBar Component
// =============================================================================

interface SteppedProgressBarProps {
  phase: AnalysisPhase
}

const SteppedProgressBar = memo(function SteppedProgressBar({ phase }: SteppedProgressBarProps) {
  const { stepIndex } = getStepFromPhase(phase)
  const overallProgress = getOverallProgress(phase)

  // Animated progress bar width
  const progressWidth = useSharedValue(0)

  useEffect(() => {
    progressWidth.value = withTiming(overallProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    })
  }, [overallProgress, progressWidth])

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }))

  return (
    <YStack
      width="100%"
      gap="$3"
      maxWidth={320}
    >
      {/* Step labels */}
      <YStack
        gap="$2"
        width="100%"
      >
        {STEPS.map((step, idx) => (
          <XStack
            key={step.key}
            alignItems="center"
            gap="$2"
            opacity={idx <= stepIndex ? 1 : 0.4}
          >
            <Text
              fontSize="$1"
              color={idx <= stepIndex ? '$color11' : '$color8'}
            >
              {idx < stepIndex ? '✓' : `${idx + 1}.`}
            </Text>
            <Text
              fontSize="$3"
              color={idx <= stepIndex ? '$color12' : '$color9'}
              fontWeight={idx === stepIndex ? '600' : '400'}
            >
              {step.label}
            </Text>
          </XStack>
        ))}
      </YStack>

      {/* Progress bar */}
      <YStack
        width="100%"
        gap="$2"
      >
        <YStack
          width="100%"
          height={6}
          backgroundColor="$color4"
          borderRadius={3}
          overflow="hidden"
        >
          <Animated.View
            style={[
              {
                height: '100%',
                backgroundColor: '#22c55e', // green-500
                borderRadius: 3,
              },
              progressBarStyle,
            ]}
          />
        </YStack>

        {/* Step indicators positioned at exact percentages */}
        <XStack
          width="100%"
          position="relative"
          height={16}
        >
          {/* Step 1: 0% (left edge) */}
          <YStack
            position="absolute"
            left={0}
            alignItems="center"
            opacity={0 <= stepIndex ? 1 : 0.4}
          >
            <Text
              fontSize="$1"
              color={0 <= stepIndex ? '$color11' : '$color8'}
            >
              {0 < stepIndex ? '✓' : '1'}
            </Text>
          </YStack>

          {/* Step 2: 33.3% */}
          <YStack
            position="absolute"
            left="33.3%"
            alignItems="center"
            opacity={1 <= stepIndex ? 1 : 0.4}
            style={STEP_2_TRANSFORM}
          >
            <Text
              fontSize="$1"
              color={1 <= stepIndex ? '$color11' : '$color8'}
            >
              {1 < stepIndex ? '✓' : '2'}
            </Text>
          </YStack>

          {/* Step 3: 66.6% */}
          <YStack
            position="absolute"
            left="66.6%"
            alignItems="center"
            opacity={2 <= stepIndex ? 1 : 0.4}
            style={STEP_3_TRANSFORM}
          >
            <Text
              fontSize="$1"
              color={2 <= stepIndex ? '$color11' : '$color8'}
            >
              {2 < stepIndex ? '✓' : '3'}
            </Text>
          </YStack>

          {/* Done: 100% (right edge) */}
          <YStack
            position="absolute"
            right={0}
            alignItems="center"
            opacity={overallProgress >= 100 ? 1 : 0.4}
          >
            <Text
              fontSize="$1"
              color={overallProgress >= 100 ? '$color11' : '$color8'}
            >
              Done
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  )
})

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

  const { title, description } = useMemo(() => getPhaseText(phase), [phase])

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
            backgroundColor="rgba(0, 0, 0, 0.9)"
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
        style={[
          contentAnimatedStyle,
          {
            pointerEvents: isProcessing ? 'auto' : 'none',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
        testID="processing-indicator"
        accessibilityLabel="Processing video analysis"
        accessibilityRole="progressbar"
      >
        {/* Spinner and text - fixed position regardless of description length */}
        <YStack
          paddingBottom="10%"
          alignItems="center"
          gap="$4"
          maxWidth={420}
          paddingHorizontal="$6"
          minHeight={180}
        >
          {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
          <Spinner
            size="large"
            color="$color12"
          />
          <Text
            fontSize="$4"
            fontWeight="600"
            color="$color12"
            textAlign="center"
          >
            {title}
          </Text>
          <Text
            fontSize="$4"
            fontWeight="400"
            color="$color11"
            textAlign="center"
          >
            {description}
          </Text>
        </YStack>

        {/* SteppedProgressBar - positioned at bottom */}
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          alignItems="center"
          paddingBottom="$6"
        >
          <SteppedProgressBar phase={phase} />
        </YStack>
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
