import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import { ConfirmDialog, FeedbackTypeButton, GlassBackground, GlassButton, TextArea } from '@my/ui'
import { Gift, Send } from '@tamagui/lucide-icons'
import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native'
import { Avatar, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { useSubmitFeedback } from './hooks/useSubmitFeedback'
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
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  const containerStyle = useMemo(() => ({ flex: 1 as const }), [])
  const keyboardAvoidingStyle = useMemo(() => ({ flex: 1 as const }), [])

  const [selectedType, setSelectedType] = useState<FeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const { mutate: submitFeedback, isPending } = useSubmitFeedback()
  const scrollViewRef = useRef<ScrollView>(null)

  const handleSubmit = (): void => {
    if (!message.trim()) return

    // Dismiss keyboard when submitting
    Keyboard.dismiss()

    submitFeedback(
      { type: selectedType, message: message.trim() },
      {
        onSuccess: () => {
          setShowSuccessDialog(true)
          // onSuccess is called when dialog is dismissed for navigation
        },
        onError: (error) => {
          log.error('GiveFeedbackScreen', 'Failed to submit feedback', {
            error: error instanceof Error ? error.message : 'Unknown error',
            feedbackType: selectedType,
          })
        },
      }
    )
  }

  const handleTextAreaFocus = (): void => {
    // Scroll to text area when focused to ensure it's visible above keyboard
    // KeyboardAvoidingView handles main positioning; this ensures input is in view
    if (scrollViewRef.current) {
      // Small delay to allow keyboard animation to start
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 0)
    }
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <KeyboardAvoidingView
          style={keyboardAvoidingStyle}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            flex={1}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <YStack
              paddingTop={insets.top + APP_HEADER_HEIGHT}
              paddingHorizontal="$4"
              gap="$6"
              paddingBottom={insets.bottom + 24}
            >
              {/* Introduction */}
              <YStack
                alignItems="center"
                gap="$4"
                marginBottom="$6"
                paddingHorizontal="$4"
                paddingTop="$8"
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
                  color="$color11"
                  textAlign="center"
                >
                  We'd love to hear your thoughts, suggestions, or report any issues you've
                  encountered.
                </Text>
              </YStack>

              {/* Feedback Form */}
              <YStack
                gap="$6"
                paddingHorizontal="$4"
                flex={1}
              >
                {/* Feedback Type Selection */}
                <YStack gap="$3">
                  <Text
                    fontSize="$5"
                    color="$color"
                    fontWeight="500"
                  >
                    What type of feedback is this?
                  </Text>
                  <XStack
                    flexWrap="wrap"
                    gap="$3"
                  >
                    {FEEDBACK_TYPES.map((type) => (
                      <YStack
                        key={type.id}
                        //flex={1}
                        minWidth="47.5%"
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
                </YStack>

                {/* Message Input */}
                <YStack
                  gap="$3"
                  flex={1}
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
                    backgroundColor="$color3"
                    onFocus={handleTextAreaFocus}
                  />
                  {message.trim() && (
                    <Text
                      position="absolute"
                      right="$4"
                      bottom="$4"
                      fontSize="$1"
                      color="$color11"
                    >
                      {message.length} / 1000 characters
                    </Text>
                  )}
                </YStack>

                {/* Submit Button */}
                <YStack
                  paddingTop="$0"
                  marginTop="$-4"
                  borderTopWidth={1}
                  borderColor="$borderColor"
                  paddingBottom="$0"
                >
                  <YStack
                    position="relative"
                    opacity={!message.trim() || isPending ? 0.5 : 1}
                  >
                    <GlassButton
                      onPress={handleSubmit}
                      disabled={!message.trim() || isPending}
                      testID="send-feedback-button"
                      accessibilityLabel={isPending ? 'Sending feedback' : 'Send feedback'}
                      minHeight={44}
                      minWidth="100%"
                      borderRadius="$4"
                      borderWidth={1.1}
                      borderColor="$color12"
                      blurIntensity={0}
                      blurTint="light"
                      variant="variant2"
                      overlayOpacity={0.2}
                    >
                      {isPending ? (
                        <XStack
                          alignItems="center"
                          justifyContent="center"
                          gap="$2"
                        >
                          {/* @ts-ignore - Tamagui Spinner has overly strict color typing */}
                          <Spinner
                            size="small"
                            color="$blue10"
                            testID="send-feedback-spinner"
                          />
                          <Text
                            fontSize="$3"
                            fontWeight="400"
                            color="$color12"
                          >
                            Sending...
                          </Text>
                        </XStack>
                      ) : (
                        <XStack
                          alignItems="center"
                          justifyContent="center"
                          gap="$2"
                        >
                          <Send
                            size={16}
                            color="$color12"
                          />
                          <Text
                            fontSize="$3"
                            fontWeight="400"
                            color="$color12"
                            testID="send-feedback-text"
                          >
                            Send Feedback
                          </Text>
                        </XStack>
                      )}
                    </GlassButton>
                    {/* Disabled overlay */}
                    {(!message.trim() || isPending) && (
                      <YStack
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        backgroundColor="rgba(0, 0, 0, 0.3)"
                        borderRadius="$4"
                        pointerEvents="none"
                        testID="send-feedback-disabled-overlay"
                      />
                    )}
                  </YStack>
                </YStack>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Success Dialog */}
      <ConfirmDialog
        visible={showSuccessDialog}
        title="We've received your gift!"
        message={"Thank you 🙏\nWe'll read it during a peaceful moment 😌"}
        variant="success"
        confirmLabel="OK"
        onConfirm={() => {
          setShowSuccessDialog(false)
          // Navigate away after user dismisses the dialog
          onSuccess?.()
        }}
        onCancel={() => {
          setShowSuccessDialog(false)
          // Navigate away after user dismisses the dialog
          onSuccess?.()
        }}
        testID="feedback-success-dialog"
      />
    </GlassBackground>
  )
}
