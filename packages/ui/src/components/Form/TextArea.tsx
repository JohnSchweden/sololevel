import type React from 'react'
import { Platform } from 'react-native'
import { TextArea, type TextAreaProps } from 'tamagui'

export interface CustomTextAreaProps extends Omit<TextAreaProps, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  minHeight?: number
  maxHeight?: number
}

/**
 * TextArea component with glass-style design
 *
 * @example
 * ```tsx
 * <TextArea
 *   value={message}
 *   onChange={setMessage}
 *   placeholder="Enter your message..."
 *   minHeight={140}
 * />
 * ```
 */
export const CustomTextArea = ({
  value,
  onChange,
  minHeight = 140,
  maxHeight,
  ...props
}: CustomTextAreaProps): React.JSX.Element => {
  return (
    <TextArea
      value={value}
      onChangeText={onChange}
      minHeight={minHeight}
      maxHeight={maxHeight}
      backgroundColor="transparent"
      borderColor="$borderColor"
      borderWidth={1}
      borderRadius="$3"
      padding="$4"
      color="$color"
      lineHeight="$1"
      fontSize="$5"
      textAlignVertical={Platform.OS === 'android' ? 'top' : undefined}
      focusStyle={{
        backgroundColor: '$backgroundHover',
        borderColor: '$borderColorHover',
      }}
      placeholderTextColor="$placeholderColor"
      {...props}
    />
  )
}
