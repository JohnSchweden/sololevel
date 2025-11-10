import { Bookmark, BookmarkCheck, Heart, MessageCircle, Share } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'

import { log } from '@my/logging'
import { Button, Text, YStack } from 'tamagui'

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
  // Local state for UI feedback
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Track bookmark count changes locally
  const [bookmarkCountOffset, setBookmarkCountOffset] = useState(0)

  // Log mount and visibility changes for debugging
  useEffect(() => {
    log.debug('SocialIcons', '📊 Component mounted/updated', {
      isVisible,
      likes,
      comments,
      bookmarks,
      shares,
      placement,
      offsetBottom,
      timestamp: Date.now(),
    })
  }, [isVisible, likes, comments, bookmarks, shares, placement, offsetBottom])

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
  const PRESS_OPACITY = 0.8
  const PRESS_SCALE = 0.9
  const HOVER_OPACITY = 0.9
  const HOVER_SCALE = 1.1
  const BUTTON_BORDER_WIDTH = 0
  const BUTTON_BORDER_COLOR = 'transparent'
  const BUTTON_MIN_WIDTH = 44
  const BUTTON_MIN_HEIGHT = 44

  // Shared button styles
  const buttonPressStyle = {
    opacity: PRESS_OPACITY,
    scale: PRESS_SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  } as const

  const buttonHoverStyle = {
    opacity: HOVER_OPACITY,
    scale: HOVER_SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  } as const

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
        <YStack
          alignItems="center"
          //gap="$1"
          backgroundColor={backgroundColor}
          //padding="$2"
          animation="quick"
        >
          <Button
            chromeless
            size={BUTTON_SIZE}
            minWidth={BUTTON_MIN_WIDTH}
            minHeight={BUTTON_MIN_HEIGHT}
            icon={Heart}
            color={isLiked ? '#ff3b30' : iconColor}
            marginBottom={marginBottom}
            onPress={handleLike}
            testID="social-like-button"
            accessibilityLabel="Like this video"
            accessibilityRole="button"
            accessibilityHint="Tap to like this video"
            animation={BUTTON_ANIMATION}
            borderRadius={BUTTON_BORDER_RADIUS}
            borderWidth={BUTTON_BORDER_WIDTH}
            borderColor={BUTTON_BORDER_COLOR}
            pressStyle={buttonPressStyle}
            hoverStyle={buttonHoverStyle}
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
          //padding="$2"
          animation="quick"
        >
          <Button
            chromeless
            size={BUTTON_SIZE}
            minWidth={BUTTON_MIN_WIDTH}
            minHeight={BUTTON_MIN_HEIGHT}
            icon={MessageCircle}
            color={iconColor}
            marginBottom={marginBottom}
            onPress={onComment}
            testID="social-comment-button"
            accessibilityLabel="Add comment"
            accessibilityRole="button"
            accessibilityHint="Tap to add a comment"
            animation={BUTTON_ANIMATION}
            borderRadius={BUTTON_BORDER_RADIUS}
            borderWidth={BUTTON_BORDER_WIDTH}
            borderColor={BUTTON_BORDER_COLOR}
            pressStyle={buttonPressStyle}
            hoverStyle={buttonHoverStyle}
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
          //padding="$1"
          animation="quick"
        >
          <Button
            chromeless
            size={BUTTON_SIZE}
            minWidth={BUTTON_MIN_WIDTH}
            minHeight={BUTTON_MIN_HEIGHT}
            icon={isBookmarked ? BookmarkCheck : Bookmark}
            color={iconColor}
            marginBottom={marginBottom}
            onPress={handleBookmark}
            testID="social-bookmark-button"
            accessibilityLabel="Bookmark this video"
            accessibilityRole="button"
            accessibilityHint="Tap to bookmark this video"
            animation={BUTTON_ANIMATION}
            borderRadius={BUTTON_BORDER_RADIUS}
            borderWidth={BUTTON_BORDER_WIDTH}
            borderColor={BUTTON_BORDER_COLOR}
            pressStyle={buttonPressStyle}
            hoverStyle={buttonHoverStyle}
          />
          <Text
            fontSize="$2"
            color={fontColor}
            testID="social-bookmarks-count"
            accessibilityLabel="Number of bookmarks"
          >
            {formatCount(displayBookmarkCount)}
          </Text>
        </YStack>

        <YStack
          alignItems="center"
          //gap="$1"
          backgroundColor={backgroundColor}
          //padding="$2"
          animation="quick"
        >
          <Button
            chromeless
            size={BUTTON_SIZE}
            minWidth={BUTTON_MIN_WIDTH}
            minHeight={BUTTON_MIN_HEIGHT}
            icon={Share}
            color={iconColor}
            marginBottom={marginBottom}
            onPress={handleShare}
            testID="social-share-button"
            accessibilityLabel="Share this video"
            accessibilityRole="button"
            accessibilityHint="Tap to share this video"
            animation={BUTTON_ANIMATION}
            borderRadius={BUTTON_BORDER_RADIUS}
            borderWidth={BUTTON_BORDER_WIDTH}
            borderColor={BUTTON_BORDER_COLOR}
            pressStyle={buttonPressStyle}
            hoverStyle={buttonHoverStyle}
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
    </>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(SocialIcons as any).whyDidYouRender = true
}
