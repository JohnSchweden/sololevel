import type { IconProps } from '@tamagui/helpers-icon'
import { Bookmark, Heart, MessageCircle, Share } from '@tamagui/lucide-icons'
import { memo, useState } from 'react'
import { Platform } from 'react-native'
import { Button, Text, YStack } from 'tamagui'

// Filled heart icon component for active state
const HeartFilled = (props: IconProps) => (
  <Heart
    {...props}
    fill="currentColor"
    strokeWidth={0}
  />
)

// Filled bookmark icon component for active state
const BookmarkFilled = (props: IconProps) => (
  <Bookmark
    {...props}
    fill="currentColor"
    strokeWidth={0}
  />
)

// Shadow styles - static, platform-evaluated once at module load
const ICON_SHADOW_STYLE =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      }
    : { elevation: 0 }

const TEXT_SHADOW_STYLE =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
      }
    : { elevation: 0 }

// Button interaction styles - immutable constants
const BUTTON_PRESS_STYLE = {
  opacity: 0.8,
  scale: 0.9,
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
} as const

const BUTTON_HOVER_STYLE = {
  opacity: 0.9,
  scale: 1.1,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
} as const

export interface SocialIconsProps {
  likes: number
  comments: number
  bookmarks: number
  shares: number
  onLike: () => void
  onComment: () => void
  onBookmark: () => void
  onShare: () => void
  isVisible?: boolean
  // placement: controls where the icon column is anchored
  // 'rightCenter' keeps previous behavior; 'rightBottom' anchors to bottom-right
  placement?: 'rightCenter' | 'rightBottom'
  // Optional fine-tuning when using bottom placement
  offsetBottom?: number
}

function SocialIconsComponent({
  likes,
  comments,
  bookmarks,
  shares,
  onLike,
  onComment,
  onBookmark,
  onShare,
  isVisible = true,
  placement = 'rightCenter',
  offsetBottom,
}: SocialIconsProps) {
  // Local state for UI feedback
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Track bookmark count changes locally
  const [bookmarkCountOffset, setBookmarkCountOffset] = useState(0)

  if (!isVisible) {
    return null
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const fontColor = '$color' // Highest contrast color - adapts to theme
  const iconColor = '$color' // Same high contrast color for icons
  const backgroundColor = 'transparent'
  const marginBottom = -4

  // Button styling constants
  const BUTTON_SIZE = 36
  const BUTTON_BORDER_RADIUS = '$10'
  const BUTTON_ANIMATION = 'bouncy'
  const BUTTON_BORDER_WIDTH = 0
  const BUTTON_BORDER_COLOR = 'transparent'
  const BUTTON_MIN_WIDTH = 44
  const BUTTON_MIN_HEIGHT = 44

  // Handle like with bounce animation
  const handleLike = () => {
    setIsLiked(!isLiked)
    onLike()
  }

  // Handle bookmark with fill animation and count update
  const handleBookmark = () => {
    const wasBookmarked = isBookmarked
    setIsBookmarked(!isBookmarked)
    // Update count: +1 if being bookmarked, -1 if being unbookmarked
    setBookmarkCountOffset(wasBookmarked ? bookmarkCountOffset - 1 : bookmarkCountOffset + 1)
    onBookmark()
  }

  // Compute display count with local offset
  const displayBookmarkCount = bookmarks + bookmarkCountOffset

  // Handle share - open sheet
  const handleShare = () => {
    onShare()
  }

  const positionalProps =
    placement === 'rightBottom'
      ? { right: '$2' as const, y: '$5' as const, bottom: offsetBottom ?? ('$10' as const) }
      : { right: '$2' as const, top: '$2' as const, y: '$-10' as const }

  /** Renders a social icon button with label and count */
  function renderSocialButton(
    icon: React.ReactNode | React.ComponentType<any>,
    testID: string,
    label: string,
    hint: string,
    count: number,
    onPress: () => void
  ) {
    return (
      <YStack
        key={testID}
        alignItems="center"
        backgroundColor={backgroundColor}
        animation="quick"
      >
        <Button
          chromeless
          size={BUTTON_SIZE}
          minWidth={BUTTON_MIN_WIDTH}
          minHeight={BUTTON_MIN_HEIGHT}
          icon={icon as any}
          color={iconColor}
          marginBottom={marginBottom}
          onPress={onPress}
          testID={testID}
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityHint={hint}
          animation={BUTTON_ANIMATION}
          borderRadius={BUTTON_BORDER_RADIUS}
          borderWidth={BUTTON_BORDER_WIDTH}
          borderColor={BUTTON_BORDER_COLOR}
          pressStyle={BUTTON_PRESS_STYLE}
          hoverStyle={BUTTON_HOVER_STYLE}
          style={ICON_SHADOW_STYLE}
        />
        <Text
          fontSize="$2"
          color={fontColor}
          testID={`${testID}-count`}
          accessibilityLabel={`${label} count`}
          style={TEXT_SHADOW_STYLE}
        >
          {formatCount(count)}
        </Text>
      </YStack>
    )
  }

  return (
    <>
      <YStack
        position="absolute"
        gap="$2"
        opacity={1}
        animation="quick"
        enterStyle={{
          opacity: 0,
          scale: 0.8,
          x: 20,
        }}
        exitStyle={{
          opacity: 0,
          scale: 0.8,
          x: 20,
        }}
        testID="social-icons-vertical"
        accessibilityLabel="Social interaction buttons"
        accessibilityRole="toolbar"
        zIndex={10}
        {...positionalProps}
      >
        {renderSocialButton(
          isLiked ? HeartFilled : Heart,
          'social-like-button',
          'Like this video',
          'Tap to like this video',
          likes,
          handleLike
        )}
        {renderSocialButton(
          MessageCircle,
          'social-comment-button',
          'Add comment',
          'Tap to add a comment',
          comments,
          onComment
        )}
        {renderSocialButton(
          isBookmarked ? BookmarkFilled : Bookmark,
          'social-bookmark-button',
          'Bookmark this video',
          'Tap to bookmark this video',
          displayBookmarkCount,
          handleBookmark
        )}
        {renderSocialButton(
          Share,
          'social-share-button',
          'Share this video',
          'Tap to share this video',
          shares,
          handleShare
        )}
      </YStack>
    </>
  )
}

// Memoize to prevent re-renders when parent updates (e.g., currentTime changes)
export const SocialIcons = memo(SocialIconsComponent)

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(SocialIcons as any).whyDidYouRender = true
}
