import { memo } from 'react'

import { Spinner, Text, YStack } from 'tamagui'

import type { AnalysisPhase } from '../hooks/useAnalysisState'

interface ProcessingIndicatorProps {
  phase: AnalysisPhase
  progress: {
    upload: number
    analysis: number
    feedback: number
  }
  channelExhausted: boolean
}

export const ProcessingIndicator = memo(function ProcessingIndicator({
  phase,
  channelExhausted,
}: ProcessingIndicatorProps) {
  const isProcessing = phase !== 'ready' && phase !== 'error'

  return (
    <YStack
      pointerEvents="none"
      position="absolute"
      inset={0}
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
    >
      {isProcessing && (
        <YStack
          testID="processing-indicator"
          alignItems="center"
          justifyContent="center"
          gap="$4"
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
})

ProcessingIndicator.displayName = 'ProcessingIndicator'
