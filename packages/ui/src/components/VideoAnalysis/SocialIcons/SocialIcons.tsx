import { Bookmark, Heart, MessageCircle, Share } from '@tamagui/lucide-icons'
import { Text, YStack } from 'tamagui'
import { Button } from 'tamagui'

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

export function SocialIcons({
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

  const fontColor = '$color2' // Highest contrast color - adapts to theme
  const iconColor = '$color2' // Same high contrast color for icons
  const backgroundColor = 'transparent'
  const marginBottom = -4

  const positionalProps =
    placement === 'rightBottom'
      ? { right: 16, bottom: offsetBottom ?? 52 }
      : { right: 16, top: 40, y: -50 }

  return (
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
      <YStack
        alignItems="center"
        //gap="$1"
        backgroundColor={backgroundColor}
        borderRadius={24}
        //padding="$2"
        animation="quick"
      >
        <Button
          chromeless
          size={36}
          icon={Heart}
          color={iconColor}
          marginBottom={marginBottom}
          onPress={onLike}
          testID="social-like-button"
          accessibilityLabel="Like this video"
          accessibilityRole="button"
          accessibilityHint="Tap to like this video"
        />
        <Text
          fontSize="$2"
          color={fontColor}
          testID="social-likes-count"
          accessibilityLabel="Number of likes"
        >
          {formatCount(likes)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        //gap="$1"
        backgroundColor={backgroundColor}
        borderRadius={24}
        //padding="$2"
        animation="quick"
      >
        <Button
          chromeless
          size={36}
          icon={MessageCircle}
          color={iconColor}
          marginBottom={marginBottom}
          onPress={onComment}
          testID="social-comment-button"
          accessibilityLabel="Add comment"
          accessibilityRole="button"
          accessibilityHint="Tap to add a comment"
        />
        <Text
          fontSize="$2"
          color={fontColor}
          testID="social-comments-count"
          accessibilityLabel="Number of comments"
        >
          {formatCount(comments)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        //gap="$1"
        backgroundColor={backgroundColor}
        borderRadius={24}
        //padding="$1"
        animation="quick"
      >
        <Button
          chromeless
          size={36}
          icon={Bookmark}
          color={iconColor}
          marginBottom={marginBottom}
          onPress={onBookmark}
          testID="social-bookmark-button"
          accessibilityLabel="Bookmark this video"
          accessibilityRole="button"
          accessibilityHint="Tap to bookmark this video"
        />
        <Text
          fontSize="$2"
          color={fontColor}
          testID="social-bookmarks-count"
          accessibilityLabel="Number of bookmarks"
        >
          {formatCount(bookmarks)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        //gap="$1"
        backgroundColor={backgroundColor}
        borderRadius={24}
        //padding="$2"
        animation="quick"
      >
        <Button
          chromeless
          size={36}
          icon={Share}
          color={iconColor}
          marginBottom={marginBottom}
          onPress={onShare}
          testID="social-share-button"
          accessibilityLabel="Share this video"
          accessibilityRole="button"
          accessibilityHint="Tap to share this video"
        />
        <Text
          fontSize="$2"
          color={fontColor}
          testID="social-shares-count"
          accessibilityLabel="Number of shares"
        >
          {formatCount(shares)}
        </Text>
      </YStack>
    </YStack>
  )
}
