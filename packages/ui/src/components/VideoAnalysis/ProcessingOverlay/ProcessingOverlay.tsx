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

  const progressPercentage = Math.round(Math.min(Math.max(progress * 100, 0), 100))
  const currentStage = Math.ceil(progress / 20)

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
      accessibilityLabel={`Processing overlay: ${isComplete ? 'Analysis complete' : 'Analysis in progress'}`}
      // accessibilityRole="dialog"
      accessibilityState={{ busy: !isComplete }}
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
        accessibilityLabel={`Processing spinner: ${isComplete ? 'Complete' : 'Active'}`}
        accessibilityRole="progressbar"
        accessibilityState={{ busy: !isComplete }}
      >
        {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
        <Spinner
          size="small"
          color="$color12"
        />
      </YStack>

      {/* Pipeline Stage Indicator */}
      <YStack
        alignItems="center"
        gap="$3"
        accessibilityLabel="Processing stage information"
      >
        <Text
          fontSize="$5"
          fontWeight="600"
          color="$color12"
          textAlign="center"
          accessibilityLabel={`Current step: ${currentStep}`}
        >
          {currentStep}
        </Text>
        <Text
          fontSize="$4"
          color="$color11"
          textAlign="center"
          accessibilityLabel={`Stage ${currentStage} of 5`}
        >
          Stage {currentStage} of 5
        </Text>

        {/* Progress Bar */}
        <YStack
          width="80%"
          height={4}
          backgroundColor="$color8"
          borderRadius="$1"
          testID="progress-bar"
          accessibilityLabel={`Progress bar: ${progressPercentage}% complete`}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progressPercentage }}
        >
          <YStack
            height="100%"
            width={`${progressPercentage}%`}
            backgroundColor="$blue9"
            borderRadius="$1"
          />
        </YStack>

        {/* Progress Percentage */}
        <Text
          fontSize="$3"
          color="$color11"
          textAlign="center"
          accessibilityLabel={`Processing progress: ${progressPercentage} percent complete`}
        >
          {`${progressPercentage}%`}
        </Text>
      </YStack>

      {/* Analysis Status */}
      <YStack
        gap="$3"
        marginTop="$6"
        alignItems="center"
        accessibilityLabel="Analysis status information"
      >
        <Text
          fontSize="$5"
          fontWeight="600"
          textAlign="center"
          color="$color12"
          accessibilityLabel={isComplete ? 'AI Analysis Complete' : 'AI Analysis in Progress'}
        >
          {isComplete ? 'AI Analysis Complete' : 'AI Analysis in Progress'}
        </Text>
        <Text
          fontSize="$4"
          color="$color11"
          textAlign="center"
          accessibilityLabel="Processing your video with advanced AI"
        >
          Processing your video with advanced AI
        </Text>
        <Text
          fontSize="$3"
          color="$color11"
          textAlign="center"
          accessibilityLabel={`Time estimate: ${formatTime(estimatedTime)}`}
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
        accessibilityLabel="Processing action buttons"
        accessibilityRole="toolbar"
      >
        <Button
          variant="outlined"
          flex={1}
          onPress={onCancel}
          testID="cancel-button"
          accessibilityLabel="Cancel processing"
          accessibilityRole="button"
          accessibilityHint="Tap to cancel the video analysis process"
        >
          <Text>Cancel</Text>
        </Button>
        <Button
          chromeless
          flex={1}
          onPress={isComplete ? onViewResults : undefined}
          disabled={!isComplete}
          opacity={isComplete ? 1 : 0.5}
          testID="view-results-button"
          accessibilityLabel={`View analysis results${isComplete ? '' : ' (disabled until processing complete)'}`}
          accessibilityRole="button"
          accessibilityHint={
            isComplete
              ? 'Tap to view your analysis results'
              : 'Button will be enabled when processing is complete'
          }
          accessibilityState={{ disabled: !isComplete }}
        >
          <Text>View Results</Text>
        </Button>
      </XStack>
    </YStack>
  )
}
