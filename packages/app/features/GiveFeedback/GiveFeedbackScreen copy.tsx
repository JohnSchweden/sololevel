import { FeedbackTypeButton, GlassBackground, TextArea } from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { Gift, Send } from '@tamagui/lucide-icons'
import type React from 'react'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar, Button, ScrollView, Text, XStack, YStack } from 'tamagui'
import { FEEDBACK_TYPES, type FeedbackType } from './types'

export interface GiveFeedbackScreenProps {
  onSuccess?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * GiveFeedbackScreen - Screen for users to submit feedback
 *
 * @example
 * ```tsx
 * <GiveFeedbackScreen
 *   onBack={() => router.back()}
 *   onSuccess={() => {
 *     Toast.show({ message: 'Feedback submitted!' });
 *     router.back();
 *   }}
 * />
 * ```
 */
export const GiveFeedbackScreen = ({
  onSuccess,
  testID = 'give-feedback-screen',
}: GiveFeedbackScreenProps): React.JSX.Element => {
  const headerHeight = useHeaderHeight()

  const [selectedType, setSelectedType] = useState<FeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (): Promise<void> => {
    if (!message.trim()) return

    setIsSubmitting(true)

    try {
      // TODO: Implement actual submission via API
      // await submitFeedback({ type: selectedType, message });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      onSuccess?.()
    } catch (error) {
      // TODO: Show error toast and log via logger
      // logger.error('Failed to submit feedback', { error });
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
      >
        <YStack
          paddingTop={headerHeight + 30}
          paddingBottom="$8"
          gap="$6"
        >
          {/* Introduction */}
          <YStack
            alignItems="center"
            gap="$4"
            paddingHorizontal="$4"
          >
            <Avatar
              circular
              size="$8"
              backgroundColor="$blue9"
            >
              <Gift
                size={32}
                color="white"
              />
            </Avatar>
            <Text
              fontSize="$7"
              fontWeight="600"
              color="$color"
              textAlign="center"
            >
              Help us improve
            </Text>
            <Text
              fontSize="$4"
              color="$gray11"
              textAlign="center"
            >
              We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
            </Text>
          </YStack>

          {/* Feedback Type Selection */}
          <YStack
            gap="$3"
            paddingHorizontal="$4"
            marginBottom="$4"
          >
            <Text
              fontSize="$5"
              color="$color"
              fontWeight="500"
            >
              What type of feedback is this?
            </Text>
            <YStack gap="$3">
              <XStack gap="$3">
                {FEEDBACK_TYPES.slice(0, 2).map((type) => (
                  <YStack
                    key={type.id}
                    flex={1}
                  >
                    <FeedbackTypeButton
                      id={type.id}
                      label={type.label}
                      icon={type.icon}
                      color={type.color}
                      selected={selectedType === type.id}
                      onPress={(id: string) => setSelectedType(id as FeedbackType)}
                    />
                  </YStack>
                ))}
              </XStack>
              {FEEDBACK_TYPES.length > 2 && (
                <XStack gap="$3">
                  {FEEDBACK_TYPES.slice(2).map((type) => (
                    <YStack
                      key={type.id}
                      flex={1}
                    >
                      <FeedbackTypeButton
                        id={type.id}
                        label={type.label}
                        icon={type.icon}
                        color={type.color}
                        selected={selectedType === type.id}
                        onPress={(id: string) => setSelectedType(id as FeedbackType)}
                      />
                    </YStack>
                  ))}
                </XStack>
              )}
            </YStack>
          </YStack>

          {/* Message Input */}
          <YStack
            gap="$3"
            paddingHorizontal="$4"
          >
            <Text
              fontSize="$5"
              color="$color"
              fontWeight="500"
            >
              Your message
            </Text>
            <TextArea
              value={message}
              onChange={setMessage}
              placeholder="Tell us what's on your mind..."
              minHeight={140}
              maxLength={1000}
            />
            {message.trim() && (
              <Text
                fontSize="$3"
                color="$color11"
              >
                {message.length} / 1000 characters
              </Text>
            )}
          </YStack>

          {/* Submit Button */}
          <YStack
            paddingTop="$4"
            paddingHorizontal="$4"
            borderTopWidth={1}
            borderColor="$borderColor"
          >
            <Button
              onPress={handleSubmit}
              disabled={!message.trim() || isSubmitting}
              opacity={!message.trim() || isSubmitting ? 0.5 : 1}
              backgroundColor="$blue9"
              color="white"
              pressStyle={{ backgroundColor: '$blue10' }}
              hoverStyle={{ backgroundColor: '$blue10' }}
              icon={isSubmitting ? undefined : <Send size={16} />}
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </YStack>
        </YStack>
      </ScrollView>

      <SafeAreaView edges={['bottom']} />
    </GlassBackground>
  )
}
