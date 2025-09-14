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

  return (
    <YStack
      position="absolute"
      right={-60}
      top={100}
      gap="$4"
      testID="social-icons-overlay"
    >
      <YStack
        alignItems="center"
        gap="$1"
      >
        <Button
          chromeless
          size={44}
          icon={Heart}
          onPress={onLike}
          testID="social-like-button"
          backgroundColor="$color2"
          borderRadius="$2"
          pressStyle={{ scale: 0.95 }}
        />
        <Text
          fontSize="$3"
          color="$color12"
          fontWeight="600"
        >
          {formatCount(likes)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        gap="$1"
      >
        <Button
          chromeless
          size={44}
          icon={MessageCircle}
          onPress={onComment}
          testID="social-comment-button"
          backgroundColor="$color2"
          borderRadius="$2"
          pressStyle={{ scale: 0.95 }}
        />
        <Text
          fontSize="$3"
          color="$color12"
          fontWeight="600"
        >
          {formatCount(comments)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        gap="$1"
      >
        <Button
          chromeless
          size={44}
          icon={Bookmark}
          onPress={onBookmark}
          testID="social-bookmark-button"
          backgroundColor="$color2"
          borderRadius="$2"
          pressStyle={{ scale: 0.95 }}
        />
        <Text
          fontSize="$3"
          color="$color12"
          fontWeight="600"
        >
          {formatCount(bookmarks)}
        </Text>
      </YStack>

      <YStack
        alignItems="center"
        gap="$1"
      >
        <Button
          chromeless
          size={44}
          icon={Share}
          onPress={onShare}
          testID="social-share-button"
          backgroundColor="$color2"
          borderRadius="$2"
          pressStyle={{ scale: 0.95 }}
        />
        <Text
          fontSize="$3"
          color="$color12"
          fontWeight="600"
        >
          {formatCount(shares)}
        </Text>
      </YStack>
    </YStack>
  )
}
