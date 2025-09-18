import { Bookmark, Heart, MessageCircle, Share } from '@tamagui/lucide-icons'
import { useMemo } from 'react'
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui'

// Types imported from VideoPlayer.tsx
interface FeedbackItem {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
}

interface SocialStats {
  likes: number
  comments: number
  bookmarks: number
  shares: number
}

export interface FeedbackPanelProps {
  isExpanded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  socialStats: SocialStats
  currentVideoTime?: number
  videoDuration?: number
  onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
  onSheetExpand: () => void
  onSheetCollapse: () => void
  onFeedbackItemPress: (item: FeedbackItem) => void
  onVideoSeek?: (time: number) => void
  onLike: () => void
  onComment: () => void
  onBookmark: () => void
  onShare: () => void
}

export function FeedbackPanel({
  isExpanded,
  activeTab,
  feedbackItems,
  socialStats,
  currentVideoTime = 0,
  //videoDuration = 0,
  onTabChange,
  onSheetExpand,
  onSheetCollapse,
  onFeedbackItemPress,
  //onVideoSeek,
  onLike,
  onComment,
  onBookmark,
  onShare,
}: FeedbackPanelProps) {
  const formatTime = (milliseconds: number) => {
    // Convert milliseconds to seconds for duration formatting
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'voice':
        return '$blue9'
      case 'posture':
        return '$green9'
      case 'grip':
        return '$purple9'
      case 'movement':
        return '$orange9'
      default:
        return '$gray9'
    }
  }

  // Sort feedback items chronologically and determine current highlighted item
  const sortedFeedbackItems = useMemo(() => {
    return [...feedbackItems].sort((a, b) => a.timestamp - b.timestamp)
  }, [feedbackItems])

  // Find the current feedback item that should be highlighted based on video time
  const currentFeedbackItem = useMemo(() => {
    if (!isExpanded || activeTab !== 'feedback') return null

    // Find the feedback item closest to the current video time
    const currentTimeMs = currentVideoTime * 1000 // Convert to milliseconds

    for (let i = sortedFeedbackItems.length - 1; i >= 0; i--) {
      if (currentTimeMs >= sortedFeedbackItems[i].timestamp) {
        return sortedFeedbackItems[i]
      }
    }

    return null
  }, [sortedFeedbackItems, currentVideoTime, isExpanded, activeTab])

  const handleSheetToggle = () => {
    if (isExpanded) {
      onSheetCollapse()
    } else {
      onSheetExpand()
    }
  }

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      height={isExpanded ? '50%' : '5%'}
      backgroundColor="$background"
      borderTopLeftRadius={20}
      borderTopRightRadius={20}
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={5}
      zIndex={9999} // Maximum z-index to ensure visibility
      testID="feedback-panel"
      accessibilityLabel={`Feedback panel ${isExpanded ? 'expanded' : 'collapsed'}`}
      // accessibilityRole="region"
      accessibilityState={{ expanded: isExpanded }}
    >
      <YStack flex={1}>
        {/* Handle */}
        <YStack
          alignItems="center"
          paddingVertical="$2"
          testID="sheet-handle"
          accessibilityLabel="Sheet handle"
        >
          <Button
            chromeless
            onPress={handleSheetToggle}
            testID="sheet-toggle-button"
            accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} feedback panel`}
            accessibilityRole="button"
            accessibilityHint={`Tap to ${isExpanded ? 'collapse' : 'expand'} the feedback panel`}
          >
            <YStack
              width={40}
              height={4}
              backgroundColor="$color12"
              borderRadius={2}
            />
          </Button>
        </YStack>

        {/* Video Progress Bar
        {isExpanded && videoDuration > 0 && activeTab === 'feedback' && (
          <YStack
            paddingHorizontal="$4"
            paddingTop="$2"
            testID="video-progress-section"
            accessibilityLabel="Video progress and time controls"
          >
            <XStack
              alignItems="center"
              gap="$3"
              marginBottom="$2"
            >
              <Text
                fontSize="$3"
                color="$color12"
                minWidth={40}
                testID="current-video-time"
                accessibilityLabel={`Current time: ${formatTime(currentVideoTime)}`}
              >
                {formatTime(currentVideoTime)}
              </Text>

              <YStack
                flex={1}
                height={4}
                backgroundColor="$color12"
                borderRadius="$1"
                testID="video-progress-bar"
                onPress={(event) => {
                  // Simple click-to-seek implementation
                  let clickX = 50 // Default to middle for test environment

                  // Try to get click position from various event properties
                  if (event.nativeEvent) {
                    clickX =
                      (event.nativeEvent as any).locationX ||
                      (event.nativeEvent as any).pageX ||
                      (event.nativeEvent as any).clientX ||
                      50
                  }

                  // If we have a target element, try to get its dimensions
                  if (
                    event.currentTarget &&
                    typeof (event.currentTarget as any).getBoundingClientRect === 'function'
                  ) {
                    try {
                      const rect = (event.currentTarget as any).getBoundingClientRect()
                      if (rect.width > 0) {
                        // Adjust clickX relative to element position if we got pageX
                        if ((event.nativeEvent as any).pageX && rect.left) {
                          clickX = (event.nativeEvent as any).pageX - rect.left
                        }
                        const percentage = clickX / rect.width
                        const newTime = percentage * videoDuration
                        onVideoSeek?.(newTime)
                        return
                      }
                    } catch (error) {
                      // Fall back to default behavior
                    }
                  }

                  // Fallback: assume 50% position for test environment
                  const percentage = clickX / 100
                  const newTime = percentage * videoDuration
                  onVideoSeek?.(newTime)
                }}
                accessibilityLabel="Video progress bar"
                accessibilityHint="Tap to seek to different time in video"
                accessibilityRole="progressbar"
              >
                <YStack
                  height="100%"
                  width={`${(currentVideoTime / videoDuration) * 100}%`}
                  backgroundColor="$primary"
                  borderRadius="$1"
                  testID="progress-bar-fill"
                />
              </YStack>

              <Text
                fontSize="$3"
                color="$color12"
                minWidth={40}
                testID="video-duration"
                accessibilityLabel={`Total duration: ${formatTime(videoDuration)}`}
              >
                {formatTime(videoDuration)}
              </Text>
            </XStack>
          </YStack>
        )} */}

        {/* Header with Tabs */}
        {isExpanded && (
          <YStack
            paddingHorizontal="$4"
            paddingBottom="$3"
            testID="sheet-header"
            accessibilityLabel="Sheet header with navigation tabs"
          >
            <XStack
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
              testID="tab-navigation"
              accessibilityLabel="Tab navigation"
              accessibilityRole="tablist"
              backgroundColor="$background"
              paddingTop="$2"
            >
              {(['feedback', 'insights', 'comments'] as const).map((tab) => (
                <Button
                  key={tab}
                  chromeless
                  flex={1}
                  paddingVertical="$3"
                  onPress={() => onTabChange(tab)}
                  testID={`tab-${tab}`}
                  accessibilityLabel={`${tab} tab`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === tab }}
                  accessibilityHint={`Switch to ${tab} view`}
                >
                  <Text
                    fontSize="$4"
                    fontWeight="600"
                    color={activeTab === tab ? '$purple9' : '$color11'}
                    textTransform="capitalize"
                  >
                    {tab}
                  </Text>
                </Button>
              ))}
            </XStack>
          </YStack>
        )}

        {/* Content */}
        <YStack
          flex={1}
          paddingHorizontal="$4"
          accessibilityLabel={`${activeTab} content area`}
        >
          {activeTab === 'feedback' && (
            <ScrollView
              flex={1}
              testID="feedback-content"
              accessibilityLabel="Feedback items list"
              accessibilityRole="list"
            >
              <YStack
                gap="$3"
                paddingTop="$2"
              >
                {sortedFeedbackItems.map((item, index) => {
                  const isHighlighted = currentFeedbackItem?.id === item.id
                  return (
                    <YStack
                      key={item.id}
                      paddingVertical="$3"
                      borderBottomWidth={1}
                      borderBottomColor="$borderColor"
                      backgroundColor={isHighlighted ? '$primary' : 'transparent'}
                      borderRadius={isHighlighted ? '$2' : 0}
                      onPress={() => onFeedbackItemPress(item)}
                      testID={`feedback-item-${index + 1}`}
                      accessibilityLabel={`Feedback item: ${item.text}${isHighlighted ? ' (currently active)' : ''}`}
                      accessibilityRole="button"
                      accessibilityHint={`Tap to view details about ${item.category} feedback from ${formatTime(item.timestamp)}`}
                      accessibilityState={{
                        disabled: false,
                        selected: isHighlighted,
                      }}
                    >
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                        marginBottom="$1"
                      >
                        <Text
                          fontSize="$3"
                          color="$color10"
                          accessibilityLabel={`Time: ${formatTime(item.timestamp)}`}
                        >
                          {formatTime(item.timestamp)}
                        </Text>
                        <Text
                          fontSize="$3"
                          color={getCategoryColor(item.category)}
                          fontWeight="600"
                          textTransform="capitalize"
                          accessibilityLabel={`Category: ${item.category}`}
                        >
                          {item.category}
                        </Text>
                      </XStack>
                      <Text
                        fontSize="$4"
                        color={isHighlighted ? '$white' : '$color12'}
                        lineHeight="$5"
                        accessibilityLabel={`Feedback: ${item.text}`}
                      >
                        {item.text}
                      </Text>
                    </YStack>
                  )
                })}
              </YStack>
            </ScrollView>
          )}

          {activeTab === 'insights' && (
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              testID="insights-content"
              accessibilityLabel="Insights content area"
            >
              <Text
                fontSize="$5"
                color="$color11"
                textAlign="center"
                accessibilityLabel="Insights Coming Soon"
              >
                Insights Coming Soon
              </Text>
              <Text
                fontSize="$4"
                color="$color10"
                textAlign="center"
                marginTop="$2"
                accessibilityLabel="Advanced analysis and performance metrics will be displayed here"
              >
                Advanced analysis and performance metrics will be displayed here.
              </Text>
            </YStack>
          )}

          {activeTab === 'comments' && (
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              testID="comments-content"
              accessibilityLabel="Comments content area"
            >
              <Text
                fontSize="$5"
                color="$color11"
                textAlign="center"
                accessibilityLabel="Comments Coming Soon"
              >
                Comments Coming Soon
              </Text>
              <Text
                fontSize="$4"
                color="$color10"
                textAlign="center"
                marginTop="$2"
                accessibilityLabel="Community discussions and expert feedback will appear here"
              >
                Community discussions and expert feedback will appear here.
              </Text>
            </YStack>
          )}
        </YStack>

        {/* Social Icons */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          justifyContent="space-around"
          testID="social-icons"
          accessibilityLabel="Social interaction buttons"
          accessibilityRole="toolbar"
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
              testID="like-button"
              accessibilityLabel={`Like this video. Currently ${socialStats.likes} likes`}
              accessibilityRole="button"
              accessibilityHint="Tap to like this video"
            />
            <Text
              fontSize="$3"
              color="$color12"
              accessibilityLabel={`${socialStats.likes} likes`}
            >
              {socialStats.likes}
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
              testID="comment-button"
              accessibilityLabel={`Add comment. Currently ${socialStats.comments} comments`}
              accessibilityRole="button"
              accessibilityHint="Tap to add a comment"
            />
            <Text
              fontSize="$3"
              color="$color12"
              accessibilityLabel={`${socialStats.comments} comments`}
            >
              {socialStats.comments}
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
              testID="bookmark-button"
              accessibilityLabel={`Bookmark this video. Currently ${socialStats.bookmarks} bookmarks`}
              accessibilityRole="button"
              accessibilityHint="Tap to bookmark this video"
            />
            <Text
              fontSize="$3"
              color="$color12"
              accessibilityLabel={`${socialStats.bookmarks} bookmarks`}
            >
              {socialStats.bookmarks}
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
              testID="share-button"
              accessibilityLabel={`Share this video. Currently ${socialStats.shares} shares`}
              accessibilityRole="button"
              accessibilityHint="Tap to share this video"
            />
            <Text
              fontSize="$3"
              color="$color12"
              accessibilityLabel={`${socialStats.shares} shares`}
            >
              {socialStats.shares}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  )
}
