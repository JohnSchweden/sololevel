import { Headphones, Mic, MicOff, Plus } from '@tamagui/lucide-icons'
import type React from 'react'
import { Button, TextArea, XStack, YStack } from 'tamagui'

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttachment?: () => void
  onVoiceToggle?: () => void
  onVoiceMode?: () => void
  isListening?: boolean
  disabled?: boolean
  placeholder?: string
  testID?: string
}

/**
 * ChatInput component for coach chat
 *
 * White container with textarea and action buttons (attachment, voice, voice mode).
 * Auto-resize textarea with Enter to send, Shift+Enter for newline.
 *
 * @example
 * ```tsx
 * <ChatInput
 *   value={message}
 *   onChange={setMessage}
 *   onSend={handleSend}
 *   placeholder="Message your coach"
 * />
 * ```
 */
export const ChatInput = ({
  value,
  onChange,
  onSend,
  onAttachment,
  onVoiceToggle,
  onVoiceMode,
  isListening = false,
  disabled = false,
  placeholder = 'Message your coach',
  testID = 'chat-input',
}: ChatInputProps): React.JSX.Element => {
  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend()
      }
    }
  }

  return (
    <YStack testID={testID}>
      {/* Input Container */}
      <XStack
        backgroundColor="$background"
        borderRadius="$5"
        //gap="$1"
        alignItems="center"
        borderWidth={1}
        borderColor="$borderColor"
      >
        {/* Attachment Button */}
        {onAttachment && (
          <Button
            onPress={onAttachment}
            disabled={disabled}
            chromeless
            circular
            margin="$-0.5"
            size="$5"
            icon={Plus}
            minHeight={44}
            testID={`${testID}-attachment`}
            accessibilityLabel="Attach file"
          />
        )}

        {/* Text Input */}
        <TextArea
          value={value}
          onChangeText={onChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          flex={1}
          minHeight={32}
          maxHeight={120}
          backgroundColor="transparent"
          borderWidth={0}
          padding={0}
          paddingVertical="$2"
          lineHeight={18}
          fontSize="$4"
          testID={`${testID}-textarea`}
          accessibilityLabel="Message input"
        />

        {/* Action Buttons */}
        <XStack>
          {/* Voice Toggle */}
          {onVoiceToggle && (
            <Button
              onPress={onVoiceToggle}
              disabled={disabled}
              chromeless
              circular
              margin="$-0.5"
              size="$5"
              icon={isListening ? MicOff : Mic}
              minHeight={44}
              minWidth={44}
              backgroundColor={isListening ? '$red4' : 'transparent'}
              color={isListening ? '$red11' : '$color'}
              testID={`${testID}-voice`}
              accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
            />
          )}

          {/* Voice Mode */}
          {onVoiceMode && (
            <Button
              onPress={onVoiceMode}
              disabled={disabled}
              chromeless
              circular
              size="$5"
              icon={Headphones}
              minHeight={44}
              minWidth={44}
              testID={`${testID}-voice-mode`}
              accessibilityLabel="Voice mode"
            />
          )}
        </XStack>
      </XStack>
    </YStack>
  )
}
