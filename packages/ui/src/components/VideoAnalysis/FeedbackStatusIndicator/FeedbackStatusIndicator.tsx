import { Clock, PlayCircle, XCircle } from '@tamagui/lucide-icons'
import { Spinner, Text, XStack } from 'tamagui'

export type FeedbackProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed'

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
  const isAnyProcessing = isSSMLProcessing || isAudioProcessing
  const isSSMLFailed = ssmlStatus === 'failed'
  const isAudioFailed = audioStatus === 'failed'
  const isAnyFailed = isSSMLFailed || isAudioFailed
  const isSSMLCompleted = ssmlStatus === 'completed'
  const isAudioCompleted = audioStatus === 'completed'
  const isFullyCompleted = isSSMLCompleted && isAudioCompleted

  if (isAnyFailed) {
    return (
      <XStack
        alignItems="center"
        gap="$2"
        testID={testID}
      >
        <XCircle
          size={iconSize}
          color="$red9"
        />
        <Text
          fontSize={textSize}
          color="$red9"
        >
          Failed
        </Text>
        <Text
          fontSize="$1"
          color="$red10"
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
          color="$green9"
        />
        <Text
          fontSize={textSize}
          color="$green9"
        >
          Ready
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
        <Spinner
          size={size === 'small' ? 'small' : 'large'}
          color="$blue9"
        />
        <Text
          fontSize={textSize}
          color="$blue9"
        >
          Processing
        </Text>
        <Text
          fontSize="$1"
          color="$blue8"
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
        color="$gray9"
      />
      <Text
        fontSize={textSize}
        color="$gray9"
      >
        Queued
      </Text>
    </XStack>
  )
}
