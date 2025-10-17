import type React from 'react'
import { TextArea as TamaguiTextArea, type TextAreaProps as TamaguiTextAreaProps } from 'tamagui'

export interface TextAreaProps extends Omit<TamaguiTextAreaProps, 'onChange'> {
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
export const TextArea = ({
  value,
  onChange,
  minHeight = 140,
  maxHeight,
  ...props
}: TextAreaProps): React.JSX.Element => {
  return (
    <TamaguiTextArea
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
      fontSize="$5"
      focusStyle={{
        backgroundColor: '$backgroundHover',
        borderColor: '$borderColorHover',
      }}
      placeholderTextColor="$placeholderColor"
      {...props}
    />
  )
}
