import { Button, Circle, Text, YStack } from 'tamagui'

interface UploadErrorStateProps {
  visible: boolean
  errorMessage: string | null
  onRetry: () => void
  onBack: () => void
}

export function UploadErrorState({
  visible,
  errorMessage,
  onRetry,
  onBack,
}: UploadErrorStateProps) {
  if (!visible) {
    return null
  }

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$4"
      backgroundColor="$background"
      testID="upload-error-state"
    >
      <YStack
        alignItems="center"
        gap="$4"
        maxWidth={400}
      >
        <YStack
          width={80}
          height={80}
          borderRadius="$4"
          backgroundColor="$red2"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor="$red5"
        >
          <Circle
            size={32}
            backgroundColor="$red9"
          />
        </YStack>

        <Text
          fontSize="$6"
          fontWeight="600"
          color="$color11"
          textAlign="center"
        >
          Upload Failed
        </Text>

        <Text
          fontSize="$4"
          color="$color9"
          textAlign="center"
          lineHeight="$4"
        >
          {errorMessage || 'The video upload failed. Please try again.'}
        </Text>

        <YStack
          gap="$3"
          width="100%"
        >
          <Button
            size="$5"
            backgroundColor="$color9"
            color="white"
            fontWeight="600"
            onPress={onRetry}
            testID="upload-error-retry-button"
          >
            Try Again
          </Button>

          <Button
            size="$5"
            variant="outlined"
            onPress={onBack}
            testID="upload-error-back-button"
          >
            Back to Camera
          </Button>
        </YStack>
      </YStack>
    </YStack>
  )
}
