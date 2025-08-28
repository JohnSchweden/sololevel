import { Button, Paragraph, XStack, YStack } from '@my/ui'
import { AlertTriangle, X } from '@tamagui/lucide-icons'
import { useState } from 'react'

interface ErrorBannerProps {
  error: Error
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'banner' | 'inline' | 'toast'
}

export function ErrorBanner({ error, onRetry, onDismiss, variant = 'banner' }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  // Don't expose internal error details to users
  const userMessage = getUserFriendlyMessage(error)

  if (variant === 'inline') {
    return (
      <YStack
        backgroundColor="$red2"
        borderColor="$red6"
        borderWidth={1}
        borderRadius="$4"
        padding="$3"
        gap="$2"
      >
        <XStack
          alignItems="center"
          gap="$2"
        >
          <AlertTriangle
            size={16}
            color="$red10"
          />
          <Paragraph
            color="$red11"
            flex={1}
          >
            {userMessage}
          </Paragraph>
          {onDismiss && (
            <Button
              size="$2"
              variant="outlined"
              color="$red11"
              onPress={handleDismiss}
              icon={X}
              circular
            />
          )}
        </XStack>
        {onRetry && (
          <Button
            size="$2"
            variant="outlined"
            theme="red"
            onPress={onRetry}
            alignSelf="flex-start"
          >
            Try Again
          </Button>
        )}
      </YStack>
    )
  }

  return (
    <YStack
      backgroundColor="$red3"
      borderColor="$red6"
      borderWidth={1}
      borderRadius="$4"
      padding="$4"
      gap="$3"
      marginHorizontal="$4"
      marginVertical="$2"
    >
      <XStack
        alignItems="center"
        gap="$3"
      >
        <AlertTriangle
          size={20}
          color="$red10"
        />
        <Paragraph
          color="$red11"
          flex={1}
          fontWeight="600"
        >
          {userMessage}
        </Paragraph>
        {onDismiss && (
          <Button
            size="$3"
            variant="outlined"
            color="$red11"
            onPress={handleDismiss}
            icon={X}
            circular
          />
        )}
      </XStack>
      {onRetry && (
        <XStack justifyContent="flex-end">
          <Button
            size="$3"
            variant="outlined"
            theme="red"
            onPress={onRetry}
          >
            Try Again
          </Button>
        </XStack>
      )}
    </YStack>
  )
}

function getUserFriendlyMessage(error: Error): string {
  // Map technical errors to user-friendly messages
  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.'
  }

  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Your session has expired. Please sign in again.'
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return "You don't have permission to access this resource."
  }

  if (message.includes('not found') || message.includes('404')) {
    return 'The requested information could not be found.'
  }

  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return 'Please check your input and try again.'
  }

  // Generic fallback
  return 'Something went wrong. Please try again.'
}
