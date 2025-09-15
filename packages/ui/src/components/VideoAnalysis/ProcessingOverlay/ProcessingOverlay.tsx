import { Button, Spinner, Text, XStack, YStack } from 'tamagui'

export interface ProcessingOverlayProps {
  progress: number
  currentStep: string
  estimatedTime: number
  onCancel: () => void
  onViewResults: () => void
  isComplete: boolean
}

export function ProcessingOverlay({
  progress,
  currentStep,
  estimatedTime,
  onCancel,
  onViewResults,
  isComplete,
}: ProcessingOverlayProps) {
  // Format time display
  const formatTime = (seconds: number) => {
    if (seconds === 0) return 'Almost done...'
    if (seconds < 60) return `${seconds} seconds remaining`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} seconds remaining`
  }

  return (
    <YStack
      position="absolute"
      inset={0}
      backgroundColor="rgba(0,0,0,0.6)"
      justifyContent="center"
      alignItems="center"
      padding="$4"
      gap="$6"
      testID="processing-overlay"
      accessibilityLabel="Processing overlay"
    >
      {/* Processing Indicator */}
      <YStack
        width={40}
        height={40}
        backgroundColor="$blue9"
        borderRadius={20}
        justifyContent="center"
        alignItems="center"
        testID="processing-spinner"
        accessibilityLabel="Processing spinner"
      >
        <Spinner
          size="small"
          color="white"
        />
      </YStack>

      {/* Pipeline Stage Indicator */}
      <YStack
        alignItems="center"
        gap="$3"
      >
        <Text
          fontSize="$5"
          fontWeight="600"
          color="white"
          textAlign="center"
          accessibilityLabel={`Current step: ${currentStep}`}
        >
          {currentStep}
        </Text>
        <Text
          fontSize="$4"
          color="$gray11"
          textAlign="center"
        >
          Stage {Math.ceil(progress / 20)} of 5
        </Text>

        {/* Progress Bar */}
        <YStack
          width="80%"
          height={4}
          backgroundColor="$gray8"
          borderRadius="$1"
          testID="progress-bar"
          accessibilityLabel="Progress bar"
        >
          <YStack
            height="100%"
            width={`${Math.min(Math.max(progress * 100, 0), 100)}%`}
            backgroundColor="$blue9"
            borderRadius="$1"
          />
        </YStack>

        {/* Progress Percentage */}
        <Text
          fontSize="$3"
          color="$gray10"
          textAlign="center"
          accessibilityLabel={`Processing progress: ${Math.round(Math.min(Math.max(progress * 100, 0), 100))}%`}
        >
          {`${Math.round(Math.min(Math.max(progress * 100, 0), 100))}%`}
        </Text>
      </YStack>

      {/* Analysis Status */}
      <YStack
        gap="$3"
        marginTop="$6"
        alignItems="center"
      >
        <Text
          fontSize="$5"
          fontWeight="600"
          textAlign="center"
          color="white"
        >
          AI Analysis in Progress
        </Text>
        <Text
          fontSize="$4"
          color="$gray11"
          textAlign="center"
        >
          Processing your video with advanced AI
        </Text>
        <Text
          fontSize="$3"
          color="$gray10"
          textAlign="center"
        >
          {formatTime(estimatedTime)}
        </Text>
      </YStack>

      {/* Action Buttons */}
      <XStack
        gap="$3"
        marginTop="$6"
        width="100%"
        maxWidth={400}
      >
        <Button
          variant="outlined"
          flex={1}
          onPress={onCancel}
          accessibilityLabel="Cancel processing"
        >
          <Text testID="cancel-button">Cancel</Text>
        </Button>
        <Button
          chromeless
          flex={1}
          onPress={onViewResults}
          disabled={!isComplete}
          opacity={isComplete ? 1 : 0.5}
          accessibilityLabel="View analysis results"
        >
          <Text testID="view-results-button">View Results</Text>
        </Button>
      </XStack>
    </YStack>
  )
}
