import { memo } from 'react'

import { Text } from 'tamagui'

import { View } from 'react-native'

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

const PHASE_LABELS: Record<AnalysisPhase, string> = {
  uploading: 'Uploading your video…',
  'upload-complete': 'Upload complete. Preparing analysis…',
  analyzing: 'Analyzing performance…',
  'generating-feedback': 'Generating coach feedback…',
  ready: 'Ready',
  error: 'Something went wrong',
}

export const ProcessingIndicator = memo(function ProcessingIndicator({
  phase,
  progress,
  channelExhausted,
}: ProcessingIndicatorProps) {
  const displayProgress = Math.max(progress.upload, progress.analysis, progress.feedback)

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: 12,
        alignItems: 'center',
      }}
    >
      {phase !== 'ready' && phase !== 'error' && (
        <View
          testID="processing-indicator"
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            fontSize="$4"
            fontWeight="600"
            color="$color11"
          >
            {PHASE_LABELS[phase]}
          </Text>
          <Text color="$color9">{displayProgress}%</Text>
        </View>
      )}

      {channelExhausted && (
        <View
          testID="channel-warning"
          style={{
            marginTop: 8,
            padding: 8,
            backgroundColor: '#f97316',
            borderRadius: 8,
          }}
        >
          <Text
            color="$white"
            fontSize="$2"
          >
            Connection unstable
          </Text>
        </View>
      )}
    </View>
  )
})

ProcessingIndicator.displayName = 'ProcessingIndicator'
