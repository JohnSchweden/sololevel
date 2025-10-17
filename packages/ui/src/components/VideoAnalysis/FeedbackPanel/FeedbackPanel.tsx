import { log } from '@my/logging'
import { memo, useEffect, useMemo } from 'react'
import { LayoutAnimation, Platform } from 'react-native'
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui'
import { FeedbackErrorHandler } from '../FeedbackErrorHandler/FeedbackErrorHandler'
import { FeedbackStatusIndicator } from '../FeedbackStatusIndicator/FeedbackStatusIndicator'

// Types imported from VideoPlayer.tsx
interface FeedbackItem {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  // New status fields for SSML and audio processing
  ssmlStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  audioStatus?: 'queued' | 'processing' | 'completed' | 'failed'
  ssmlAttempts?: number
  audioAttempts?: number
  ssmlLastError?: string | null
  audioLastError?: string | null
  audioUrl?: string
  audioError?: string
  confidence: number
}

export interface FeedbackPanelProps {
  flex?: number // Added for flex-based sizing
  isExpanded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  currentVideoTime?: number
  videoDuration?: number
  selectedFeedbackId?: string | null
  onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
  onSheetExpand: () => void
  onSheetCollapse: () => void
  onFeedbackItemPress: (item: FeedbackItem) => void
  onVideoSeek?: (time: number) => void
  // Error handling callbacks
  onRetryFeedback?: (feedbackId: string) => void
  onDismissError?: (feedbackId: string) => void
  onSelectAudio?: (feedbackId: string) => void
}

export const FeedbackPanel = memo(
  function FeedbackPanel({
    flex,
    isExpanded,
    activeTab,
    feedbackItems,
    // currentVideoTime = 0, // DEPRECATED: auto-highlighting now controlled by coordinator
    selectedFeedbackId,
    //videoDuration = 0,
    onTabChange,
    onSheetExpand,
    onSheetCollapse,
    onFeedbackItemPress,
    //onVideoSeek,
    onRetryFeedback,
    onDismissError,
    onSelectAudio,
  }: FeedbackPanelProps) {
    // Trigger layout animation when flex changes
    useEffect(() => {
      if (__DEV__) {
        log.debug('FeedbackPanel', 'flex changed', { flex, platform: Platform.OS })
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        LayoutAnimation.configureNext({
          duration: 300,
          create: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
          update: {
            type: LayoutAnimation.Types.spring,
            springDamping: 0.8,
            initialVelocity: 0,
          },
        })
        if (__DEV__) {
          log.debug('FeedbackPanel', 'layout animation configured')
        }
      }
    }, [flex])

    // Log selected feedback changes (moved from render-time logging)
    useEffect(() => {
      if (__DEV__ && selectedFeedbackId) {
        log.debug('FeedbackPanel', 'Selected feedback changed', {
          selectedFeedbackId,
        })
      }
    }, [selectedFeedbackId])

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
          return '$color9'
      }
    }

    // Sort feedback items chronologically and determine current highlighted item
    const sortedFeedbackItems = useMemo(() => {
      return [...feedbackItems].sort((a, b) => a.timestamp - b.timestamp)
    }, [feedbackItems])

    // Debug: log selectedFeedbackId changes
    useEffect(() => {
      if (__DEV__) {
        log.debug('FeedbackPanel', 'selectedFeedbackId prop changed', {
          selectedFeedbackId,
        })
      }
    }, [selectedFeedbackId])

    const handleSheetToggle = () => {
      if (isExpanded) {
        onSheetCollapse()
      } else {
        onSheetExpand()
      }
    }

    return (
      <YStack
        flex={flex}
        backgroundColor="$background"
        elevation={5}
        style={{ transition: 'all 0.5s ease-in-out' }}
        testID="feedback-panel"
        accessibilityLabel={`Feedback panel ${isExpanded ? 'expanded' : 'collapsed'}`}
        accessibilityState={{ expanded: isExpanded }}
        // accessibilityRole="region"
      >
        <YStack flex={1}>
          {/* Handle */}
          <YStack
            alignItems="center"
            marginTop={-8}
            //paddingVertical="$2"
            testID="sheet-handle"
            accessibilityLabel="Sheet handle"
          >
            <Button
              chromeless
              onPress={handleSheetToggle}
              testID="sheet-toggle-button"
              accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} feedback panel`}
              aria-role="button"
              accessibilityHint={`Tap to ${isExpanded ? 'collapse' : 'expand'} the feedback panel`}
            >
              <YStack
                width={48}
                height={5}
                backgroundColor="$color8"
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
                  backgroundColor="$color9"
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
              paddingHorizontal="$3"
              //paddingBottom="$2"
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
                //paddingTop="$2"
              >
                {(['feedback', 'insights', 'comments'] as const).map((tab) => (
                  <Button
                    key={tab}
                    chromeless
                    flex={1}
                    //paddingVertical="$3"
                    onPress={() => onTabChange(tab)}
                    testID={`tab-${tab}`}
                    accessibilityLabel={`${tab} tab`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activeTab === tab }}
                    accessibilityHint={`Switch to ${tab} view`}
                    data-testid={`tab-${tab}`}
                  >
                    <Text
                      fontSize="$4"
                      fontWeight={activeTab === tab ? '600' : '400'}
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
                  paddingTop="$4"
                >
                  {sortedFeedbackItems.map((item, index) => {
                    const isHighlighted = selectedFeedbackId === item.id

                    return (
                      <YStack
                        key={item.id}
                        paddingVertical="$1"
                        //borderBottomWidth={1}
                        //borderBottomColor="$borderColor"
                        backgroundColor="transparent"
                        borderRadius={0}
                        onPress={() => onFeedbackItemPress(item)}
                        {...(item.audioUrl && onSelectAudio
                          ? {
                              onLongPress: () => onSelectAudio(item.id),
                            }
                          : {})}
                        testID={`feedback-item-${index + 1}`}
                        accessibilityLabel={`Feedback item: ${item.text}${isHighlighted ? ' (currently active)' : ''}`}
                        accessibilityRole="button"
                        accessibilityHint={`Tap to view details about ${item.category} feedback from ${formatTime(item.timestamp)}${item.audioUrl ? '. Long press to play audio feedback.' : ''}`}
                        accessibilityState={{
                          disabled: false,
                          selected: isHighlighted,
                        }}
                        {...(item.audioUrl && onSelectAudio
                          ? {
                              onLongPress: () => onSelectAudio(item.id),
                            }
                          : {})}
                      >
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                          marginBottom="$1"
                        >
                          <XStack
                            alignItems="center"
                            gap="$3"
                          >
                            <Text
                              fontSize="$1"
                              color="$color10"
                              accessibilityLabel={`Time: ${formatTime(item.timestamp)}`}
                            >
                              {formatTime(item.timestamp)}
                            </Text>
                            <Text
                              fontSize="$1"
                              color={getCategoryColor(item.category)}
                              fontWeight="600"
                              textTransform="capitalize"
                              accessibilityLabel={`Category: ${item.category}`}
                            >
                              {item.category}
                            </Text>
                          </XStack>

                          {/* Status indicators for SSML and audio processing */}
                          {(item.ssmlStatus || item.audioStatus) && (
                            <FeedbackStatusIndicator
                              ssmlStatus={item.ssmlStatus || 'queued'}
                              audioStatus={item.audioStatus || 'queued'}
                              ssmlAttempts={item.ssmlAttempts || 0}
                              audioAttempts={item.audioAttempts || 0}
                              ssmlLastError={item.ssmlLastError || null}
                              audioLastError={item.audioLastError || null}
                              size="small"
                              testID={`feedback-status-${index + 1}`}
                            />
                          )}
                        </XStack>
                        <Text
                          fontSize="$4"
                          color={isHighlighted ? '$yellow11' : '$color12'}
                          lineHeight="$5"
                          accessibilityLabel={`Feedback: ${item.text}`}
                        >
                          {item.text}
                        </Text>

                        {/* Error handler for failed processing */}
                        {(item.ssmlStatus === 'failed' || item.audioStatus === 'failed') &&
                          onRetryFeedback && (
                            <FeedbackErrorHandler
                              feedbackId={item.id}
                              feedbackText={item.text}
                              ssmlFailed={item.ssmlStatus === 'failed'}
                              audioFailed={item.audioStatus === 'failed'}
                              onRetry={onRetryFeedback}
                              onDismiss={onDismissError}
                              size="small"
                              testID={`feedback-error-${index + 1}`}
                            />
                          )}
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
        </YStack>
      </YStack>
    )
  },
  (prevProps, nextProps) => {
    // Don't re-render on frequently changing time props
    return (
      prevProps.flex === nextProps.flex &&
      prevProps.isExpanded === nextProps.isExpanded &&
      prevProps.activeTab === nextProps.activeTab &&
      prevProps.selectedFeedbackId === nextProps.selectedFeedbackId &&
      JSON.stringify(prevProps.feedbackItems) === JSON.stringify(nextProps.feedbackItems) &&
      // Ignore currentVideoTime and videoDuration as they change frequently but don't affect visual state
      prevProps.onTabChange === nextProps.onTabChange &&
      prevProps.onSheetExpand === nextProps.onSheetExpand &&
      prevProps.onSheetCollapse === nextProps.onSheetCollapse &&
      prevProps.onFeedbackItemPress === nextProps.onFeedbackItemPress &&
      prevProps.onVideoSeek === nextProps.onVideoSeek &&
      prevProps.onRetryFeedback === nextProps.onRetryFeedback &&
      prevProps.onDismissError === nextProps.onDismissError &&
      prevProps.onSelectAudio === nextProps.onSelectAudio
    )
  }
)

FeedbackPanel.displayName = 'FeedbackPanel'
