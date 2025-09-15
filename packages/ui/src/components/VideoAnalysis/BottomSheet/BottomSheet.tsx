import { Bookmark, Heart, MessageCircle, Share } from '@tamagui/lucide-icons'
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

export interface BottomSheetProps {
  isExpanded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  socialStats: SocialStats
  onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
  onSheetExpand: () => void
  onSheetCollapse: () => void
  onFeedbackItemPress: (item: FeedbackItem) => void
  onLike: () => void
  onComment: () => void
  onBookmark: () => void
  onShare: () => void
}

export function BottomSheet({
  isExpanded,
  activeTab,
  feedbackItems,
  socialStats,
  onTabChange,
  onSheetExpand,
  onSheetCollapse,
  onFeedbackItemPress,
  onLike,
  onComment,
  onBookmark,
  onShare,
}: BottomSheetProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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
      height={isExpanded ? '70%' : '15%'}
      backgroundColor="$background"
      borderTopLeftRadius={20}
      borderTopRightRadius={20}
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={5}
      testID="bottom-sheet"
      accessibilityLabel={`Bottom sheet ${isExpanded ? 'expanded' : 'collapsed'}`}
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
            accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} bottom sheet`}
            accessibilityRole="button"
            accessibilityHint={`Tap to ${isExpanded ? 'collapse' : 'expand'} the feedback panel`}
          >
            <YStack
              width={40}
              height={4}
              backgroundColor="$gray6"
              borderRadius={2}
            />
          </Button>
        </YStack>

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
                {feedbackItems.map((item, _index) => (
                  <YStack
                    key={item.id}
                    paddingVertical="$3"
                    borderBottomWidth={1}
                    borderBottomColor="$borderColor"
                    onPress={() => onFeedbackItemPress(item)}
                    testID={`feedback-item-${item.id}`}
                    accessibilityLabel={`Feedback item: ${item.text}`}
                    accessibilityRole="button"
                    accessibilityHint={`Tap to view details about ${item.category} feedback from ${formatTime(item.timestamp)}`}
                    accessibilityState={{
                      disabled: false,
                      selected: false,
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
                      color="$color12"
                      lineHeight="$5"
                      accessibilityLabel={`Feedback: ${item.text}`}
                    >
                      {item.text}
                    </Text>
                  </YStack>
                ))}
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
