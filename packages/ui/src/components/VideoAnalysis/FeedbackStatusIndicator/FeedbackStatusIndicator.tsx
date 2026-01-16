import { Clock, PlayCircle, RotateCcw, XCircle } from '@tamagui/lucide-icons'

import { Spinner, Text, XStack } from 'tamagui'

export type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface FeedbackStatusIndicatorProps {
  ssmlStatus: FeedbackProcessingStatus
  audioStatus: FeedbackProcessingStatus
  ssmlAttempts?: number
  audioAttempts?: number
  ssmlLastError?: string | null
  audioLastError?: string | null
  size?: 'small' | 'medium'
  testID?: string
}

export function FeedbackStatusIndicator({
  ssmlStatus,
  audioStatus,
  ssmlAttempts = 0,
  audioAttempts = 0,
  ssmlLastError = null,
  audioLastError = null,
  size = 'medium',
  testID,
}: FeedbackStatusIndicatorProps) {
  const iconSize = size === 'small' ? 16 : 20
  const textSize = size === 'small' ? '$1' : '$2'

  const isSSMLProcessing = ssmlStatus === 'processing'
  const isAudioProcessing = audioStatus === 'processing'
  const isAudioRetrying = audioStatus === 'retrying'
  const isAnyProcessing = isSSMLProcessing || isAudioProcessing || isAudioRetrying
  const isSSMLFailed = ssmlStatus === 'failed'
  const isAudioFailed = audioStatus === 'failed'
  const isAnyFailed = isSSMLFailed || isAudioFailed
  const isSSMLCompleted = ssmlStatus === 'completed'
  const isAudioCompleted = audioStatus === 'completed'
  const isFullyCompleted = isSSMLCompleted && isAudioCompleted

  if (isAnyFailed) {
    return (
      <XStack
        flexWrap="wrap"
        alignItems="center"
        gap="$2"
        testID={testID}
      >
        <XCircle
          size={iconSize}
          color="$color11"
        />
        <Text
          fontSize={textSize}
          color="$color11"
        >
          Failed
        </Text>
        <Text
          fontSize="$1"
          color="$color11"
        >
          {ssmlLastError ? `SSML: ${ssmlLastError}` : ''}
          {ssmlLastError && audioLastError ? ' • ' : ''}
          {audioLastError ? `Audio: ${audioLastError}` : ''}
        </Text>
      </XStack>
    )
  }

  if (isFullyCompleted) {
    return (
      <XStack
        alignItems="center"
        gap="$2"
        testID={testID}
      >
        <PlayCircle
          size={iconSize}
          color="$color11"
        />
        <Text
          fontSize={textSize}
          color="$color11"
        >
          Ready
        </Text>
      </XStack>
    )
  }

  if (isAudioRetrying) {
    return (
      <XStack
        alignItems="center"
        gap="$2"
        testID={testID}
      >
        <RotateCcw
          size={iconSize}
          color="$orange10"
        />
        <Text
          fontSize={textSize}
          color="$orange10"
        >
          Retrying...
        </Text>
        <Text
          fontSize="$1"
          color="$orange10"
        >
          {`Attempt ${audioAttempts + 1}/3`}
        </Text>
      </XStack>
    )
  }

  if (isAnyProcessing) {
    return (
      <XStack
        alignItems="center"
        gap="$2"
        testID={testID}
      >
        {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
        <Spinner
          size={size === 'small' ? 'small' : 'large'}
          color="$color11"
        />
        <Text
          fontSize={textSize}
          color="$color11"
        >
          Processing
        </Text>
        <Text
          fontSize="$1"
          color="$color11"
        >
          {`SSML retries: ${ssmlAttempts} | Audio retries: ${audioAttempts}`}
        </Text>
      </XStack>
    )
  }

  // Default to queued if not failed, completed, or processing
  return (
    <XStack
      alignItems="center"
      gap="$2"
      testID={testID}
    >
      <Clock
        size={iconSize}
        color="$color11"
      />
      <Text
        fontSize={textSize}
        color="$color11"
      >
        Queued
      </Text>
    </XStack>
  )
}
