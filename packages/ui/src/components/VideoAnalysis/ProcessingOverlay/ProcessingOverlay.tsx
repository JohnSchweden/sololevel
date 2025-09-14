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
  return (
    <YStack
      position="absolute"
      inset={0}
      backgroundColor="rgba(0,0,0,0.6)"
      justifyContent="center"
      alignItems="center"
      padding="$4"
      gap="$6"
    >
      {/* Processing Indicator */}
      <YStack
        width={40}
        height={40}
        backgroundColor="$blue9"
        borderRadius={20}
        justifyContent="center"
        alignItems="center"
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

        {/* Simple Progress Bar */}
        <YStack
          width="80%"
          height={4}
          backgroundColor="$gray8"
          borderRadius="$1"
        >
          <YStack
            height="100%"
            width={`${progress}%`}
            backgroundColor="$blue9"
            borderRadius="$1"
          />
        </YStack>
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
          Estimated time remaining: {estimatedTime}s
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
          testID="cancel-button"
        >
          Cancel
        </Button>
        <Button
          chromeless
          flex={1}
          onPress={onViewResults}
          disabled={!isComplete}
          testID="view-results-button"
          opacity={isComplete ? 1 : 0.5}
        >
          View Results
        </Button>
      </XStack>
    </YStack>
  )
}
