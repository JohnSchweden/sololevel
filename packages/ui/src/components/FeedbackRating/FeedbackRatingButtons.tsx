/**
 * FeedbackRatingButtons Component
 * Provides thumbs up/down buttons for rating feedback items
 * Toggle behavior: tap same button to clear, tap opposite to switch
 */

import { ThumbsDown, ThumbsUp } from '@tamagui/lucide-icons'
import { memo, useCallback } from 'react'
import type { ReactElement } from 'react'
import { Button, XStack } from 'tamagui'

type FeedbackRatingValue = 'up' | 'down' | null

const SIZE_CONFIG = {
  small: { iconSize: 16, buttonSize: 28 },
  medium: { iconSize: 20, buttonSize: 36 },
} as const

export interface FeedbackRatingButtonsProps {
  /** Current rating state: 'up' | 'down' | null */
  currentRating: FeedbackRatingValue
  /** Callback when rating changes (null to clear) */
  onRatingChange: (rating: FeedbackRatingValue) => void
  /** Button size */
  size?: 'small' | 'medium'
  /** Disabled state */
  disabled?: boolean
  /** Test ID for testing */
  testID?: string
}

export const FeedbackRatingButtons = memo(function FeedbackRatingButtons({
  currentRating,
  onRatingChange,
  size = 'small',
  disabled = false,
  testID = 'feedback-rating-buttons',
}: FeedbackRatingButtonsProps): ReactElement {
  const { iconSize, buttonSize } = SIZE_CONFIG[size]

  const handleThumbsUpPress = useCallback(
    function handleThumbsUpPress() {
      onRatingChange(currentRating === 'up' ? null : 'up')
    },
    [currentRating, onRatingChange]
  )

  const handleThumbsDownPress = useCallback(
    function handleThumbsDownPress() {
      onRatingChange(currentRating === 'down' ? null : 'down')
    },
    [currentRating, onRatingChange]
  )

  const sharedButtonProps = {
    chromeless: true,
    size: buttonSize,
    width: buttonSize,
    height: buttonSize,
    padding: '$0' as const,
    borderRadius: '$2' as const,
    backgroundColor: 'transparent' as const,
    hoverStyle: { backgroundColor: '$color3' as const },
    pressStyle: { backgroundColor: '$color4' as const, scale: 0.95 },
    disabled,
    accessibilityRole: 'button' as const,
  }

  return (
    <XStack
      gap="$2"
      testID={testID}
    >
      <Button
        {...sharedButtonProps}
        onPress={handleThumbsUpPress}
        testID={`${testID}-thumbs-up`}
        accessibilityLabel="Rate as helpful"
      >
        <ThumbsUp
          size={iconSize}
          color="$color11"
          fill={currentRating === 'up' ? 'currentColor' : 'none'}
        />
      </Button>

      <Button
        {...sharedButtonProps}
        onPress={handleThumbsDownPress}
        testID={`${testID}-thumbs-down`}
        accessibilityLabel="Rate as not helpful"
      >
        <ThumbsDown
          size={iconSize}
          color="$color11"
          fill={currentRating === 'down' ? 'currentColor' : 'none'}
        />
      </Button>
    </XStack>
  )
})

FeedbackRatingButtons.displayName = 'FeedbackRatingButtons'
