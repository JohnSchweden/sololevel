import { AlertCircle, RefreshCw, X } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface ConnectionErrorBannerProps {
  isVisible: boolean
  error: string | null
  reconnectAttempts: number
  onRetry?: () => void
  onDismiss?: () => void
}

export function ConnectionErrorBanner({
  isVisible,
  error,
  reconnectAttempts,
  onRetry,
  onDismiss,
}: ConnectionErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (!isVisible || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleRetry = () => {
    setIsDismissed(false)
    onRetry?.()
  }

  return (
    <YStack
      position="absolute"
      top="$4"
      left="$4"
      right="$4"
      backgroundColor="$red9"
      borderRadius="$4"
      padding="$3"
      zIndex={1000}
      testID="connection-error-banner"
    >
      <XStack
        alignItems="center"
        gap="$3"
      >
        <AlertCircle
          size={20}
          color="white"
        />

        <YStack flex={1}>
          <Text
            color="white"
            fontWeight="600"
            fontSize="$4"
          >
            Connection Lost
          </Text>
          <Text
            color="white"
            opacity={0.9}
            fontSize="$3"
          >
            {error || 'Real-time updates unavailable'}
          </Text>
          {reconnectAttempts > 0 && (
            <Text
              color="white"
              opacity={0.8}
              fontSize="$2"
            >
              Reconnection attempt {reconnectAttempts}
            </Text>
          )}
        </YStack>

        <XStack gap="$2">
          <Button
            size="$2"
            chromeless
            icon={RefreshCw}
            onPress={handleRetry}
            testID="retry-connection-button"
          />
          <Button
            size="$2"
            chromeless
            icon={X}
            onPress={handleDismiss}
            testID="dismiss-error-button"
          />
        </XStack>
      </XStack>
    </YStack>
  )
}
