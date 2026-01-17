import { AlertCircle, RotateCcw } from '@tamagui/lucide-icons'

import { Button, Text, XStack, YStack } from 'tamagui'

export interface FeedbackErrorHandlerProps {
  feedbackId: string
  feedbackText: string
  ssmlFailed: boolean
  audioFailed: boolean
  onRetry: (feedbackId: string) => void
  onDismiss?: (feedbackId: string) => void
  size?: 'small' | 'medium' | 'large'
  testID?: string
}

export function FeedbackErrorHandler({
  feedbackId,
  feedbackText: _feedbackText,
  ssmlFailed,
  audioFailed,
  onRetry,
  onDismiss: _onDismiss,
  size = 'medium',
  testID = 'feedback-error-handler',
}: FeedbackErrorHandlerProps) {
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 16 : 18
  const textSize = size === 'small' ? '$2' : size === 'medium' ? '$3' : '$4'
  const buttonSize = size === 'small' ? '$2' : size === 'medium' ? '$3' : '$4'
  const spacing = size === 'small' ? '$2' : size === 'medium' ? '$3' : '$4'

  const getErrorMessage = () => {
    if (ssmlFailed && audioFailed) {
      return 'Failed to generate speech and audio'
    }
    if (ssmlFailed) {
      return 'Failed to generate speech markup'
    }
    if (audioFailed) {
      return 'Failed to generate audio'
    }
    return 'Processing failed'
  }

  return (
    <YStack
      backgroundColor="$red2"
      borderColor="$red6"
      borderWidth={1}
      borderRadius="$4"
      padding={spacing}
      gap="$1"
      marginTop="$2"
      testID={testID}
      accessibilityLabel={`Error processing feedback: ${getErrorMessage()}`}
      accessibilityRole="alert"
    >
      {/* Error Header */}
      <XStack
        alignItems="center"
        gap="$2"
      >
        <AlertCircle
          size={iconSize}
          color="$red9"
        />
        <Text
          fontSize={textSize}
          fontWeight="600"
          color="$red11"
          flex={1}
        >
          {getErrorMessage()}
        </Text>
      </XStack>

      {/* Error Details */}
      <Text
        fontSize={size === 'small' ? '$1' : '$2'}
        color="$red10"
        lineHeight="$3"
      >
        Please ignore or try again.
        {/* {getErrorDetails()} for: "
        {feedbackText.length > 50 ? feedbackText.substring(0, 50) + '...' : feedbackText}" */}
      </Text>

      {/* Action Buttons */}
      <XStack
        gap="$2"
        justifyContent="flex-end"
        marginTop="$1"
      >
        {/* {onDismiss && (
          <Button
            size={buttonSize}
            variant="outlined"
            borderColor="$red6"
            color="$red10"
            onPress={() => onDismiss(feedbackId)}
            testID={`${testID}-dismiss`}
            accessibilityLabel="Dismiss error"
            accessibilityHint="Hide this error message"
          >
            <Text fontSize={size === 'small' ? '$1' : '$2'}>Dismiss</Text>
          </Button>
        )} */}

        <Button
          size={buttonSize}
          backgroundColor="$red9"
          color="white"
          onPress={() => onRetry(feedbackId)}
          testID={`${testID}-retry`}
          accessibilityLabel="Retry processing"
          accessibilityHint="Attempt to process this feedback again"
        >
          <XStack
            alignItems="center"
            gap="$1"
          >
            <RotateCcw size={iconSize - 2} />
            <Text fontSize={size === 'small' ? '$1' : '$2'}>Retry</Text>
          </XStack>
        </Button>
      </XStack>
    </YStack>
  )
}
