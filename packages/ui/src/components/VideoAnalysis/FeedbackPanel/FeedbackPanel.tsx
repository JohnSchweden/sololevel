import { log } from '@my/logging'
import { useAnimationCompletion } from '@ui/hooks/useAnimationCompletion'
import { useFrameDropDetection } from '@ui/hooks/useFrameDropDetection'
import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { useSmoothnessTracking } from '@ui/hooks/useSmoothnessTracking'
import { memo, useEffect, useMemo, useState } from 'react'
import { LayoutAnimation, Platform, ScrollView } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated'
import { Button, Text, XStack, YStack, styled } from 'tamagui'
import { FeedbackErrorHandler } from '../FeedbackErrorHandler/FeedbackErrorHandler'
import { FeedbackStatusIndicator } from '../FeedbackStatusIndicator/FeedbackStatusIndicator'

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

// Import the glass gradient background
//const glassGradientBackground = require('../../../../../../apps/expo/assets/glass-gradient-square.png')

/**
 * Styled components for feedback items following coaching session design pattern
 */

/**
 * Pressable container for feedback item (matches SessionItemContainer exactly)
 */
const FeedbackItemContainer = styled(YStack, {
  name: 'FeedbackItemContainer',
  gap: '$1',
  padding: 0,
  borderRadius: '$5',
  paddingVertical: '$3',
  paddingHorizontal: '$3',
  backgroundColor: '$color2',
  cursor: 'pointer',
  accessibilityRole: 'button',

  pressStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    scale: 0.98,
  },

  hoverStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  variants: {
    // Add variant support if needed in future
  } as const,
})

/**
 * Time label text (matches DateLabel exactly)
 */
const TimeLabel = styled(Text, {
  name: 'TimeLabel',
  fontSize: '$1',
  fontWeight: '500',
  color: '$color11',
})

/**
 * Feedback text content (matches SessionTitle exactly)
 */
const FeedbackText = styled(Text, {
  name: 'FeedbackText',
  fontSize: '$4',
  fontWeight: '500',
  color: '$color12',
})

/**
 * Metadata row for time and status indicators
 */
const FeedbackMetadata = styled(XStack, {
  name: 'FeedbackMetadata',
  justifyContent: 'space-between',
  alignItems: 'center',
})

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
  // TEMP_DISABLED: Sheet expand/collapse for static layout
  // onSheetExpand: () => void
  // onSheetCollapse: () => void
  onFeedbackItemPress: (item: FeedbackItem) => void
  onVideoSeek?: (time: number) => void
  // Error handling callbacks
  onRetryFeedback?: (feedbackId: string) => void
  onDismissError?: (feedbackId: string) => void
  onSelectAudio?: (feedbackId: string) => void
  // Nested scroll support
  onScrollYChange?: (scrollY: number) => void
  onScrollEndDrag?: () => void
  scrollEnabled?: boolean // Control scroll enabled state from parent
  rootPanRef?: React.RefObject<any> // Ref to gesture handler for waitFor coordination
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
    // TEMP_DISABLED: Sheet expand/collapse for static layout
    // onSheetExpand,
    // onSheetCollapse,
    onFeedbackItemPress,
    //onVideoSeek,
    onRetryFeedback,
    onDismissError,
    onSelectAudio,
    onScrollYChange,
    onScrollEndDrag,
    scrollEnabled = true, // Default to enabled
    rootPanRef,
  }: FeedbackPanelProps) {
    // Create native gesture for ScrollView that works with root pan
    const nativeGesture = rootPanRef
      ? Gesture.Native().simultaneousWithExternalGesture(rootPanRef)
      : Gesture.Native()

    // Scroll handler to track position
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        if (onScrollYChange) {
          runOnJS(onScrollYChange)(event.contentOffset.y)
        }
        runOnJS(log.debug)('FeedbackPanel.scrollHandler', 'ScrollView onScroll fired', {
          contentOffsetY: Math.round(event.contentOffset.y * 100) / 100,
          contentSizeHeight: Math.round(event.contentSize.height * 100) / 100,
          layoutMeasurementHeight: Math.round(event.layoutMeasurement.height * 100) / 100,
          scrollEnabled,
        })
      },
      onEndDrag: () => {
        if (onScrollEndDrag) {
          runOnJS(onScrollEndDrag)()
        }
        runOnJS(log.debug)('FeedbackPanel.scrollHandler', 'ScrollView onEndDrag fired', {
          scrollEnabled,
        })
      },
    })

    // Performance tracking: Track flex changes as animation triggers
    const [previousFlex, setPreviousFlex] = useState<number | undefined>(flex)
    const flexChanged = previousFlex !== flex

    // Track animation completion for LayoutAnimation
    const layoutAnimationCompletion = useAnimationCompletion({
      currentValue: flexChanged ? 1 : 0,
      targetValue: 1,
      estimatedDuration: 300,
      componentName: 'FeedbackPanel',
      animationName: 'layout-flex',
      direction: flexChanged ? 'expand' : 'none',
    })

    // Track smoothness from duration measurements (intentionally unused return values)
    void useSmoothnessTracking({
      duration: layoutAnimationCompletion.actualDuration,
      componentName: 'FeedbackPanel',
      animationName: 'layout-flex',
    })

    // Track frame drops during layout animations
    void useFrameDropDetection({
      isActive: flexChanged,
      componentName: 'FeedbackPanel',
      animationName: 'layout-flex',
    })

    // Render profiling
    useRenderProfile({
      componentName: 'FeedbackPanel',
      enabled: __DEV__,
      logInterval: 20,
      trackProps: {
        flex,
        isExpanded,
        activeTab,
        feedbackItemsCount: feedbackItems.length,
        selectedFeedbackId,
      },
    })

    // Trigger layout animation when flex changes
    useEffect(() => {
      if (flexChanged) {
        setPreviousFlex(flex)
      }

      // if (__DEV__) {
      //   log.debug('FeedbackPanel', 'flex changed', { flex, platform: Platform.OS })
      // }
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
        // if (__DEV__) {
        //   log.debug('FeedbackPanel', 'layout animation configured')
        // }
      }
    }, [flex, flexChanged])

    // Log selected feedback changes (moved from render-time logging)
    useEffect(() => {
      // if (__DEV__ && selectedFeedbackId) {
      //   log.debug('FeedbackPanel', 'Selected feedback changed', {
      //     selectedFeedbackId,
      //   })
      // }
    }, [selectedFeedbackId])

    // Log scrollEnabled prop changes
    useEffect(() => {
      log.debug('FeedbackPanel', 'scrollEnabled prop changed', {
        scrollEnabled,
        timestamp: Date.now(),
      })
    }, [scrollEnabled])

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

    // Sort feedback items chronologically and determine current highlighted item
    const sortedFeedbackItems = useMemo(() => {
      return [...feedbackItems].sort((a, b) => a.timestamp - b.timestamp)
    }, [feedbackItems])

    // Debug: log selectedFeedbackId changes
    useEffect(() => {
      // if (__DEV__) {
      //   log.debug('FeedbackPanel', 'selectedFeedbackId prop changed', {
      //     selectedFeedbackId,
      //   })
      // }
    }, [selectedFeedbackId])

    // TEMP_DISABLED: Sheet toggle functionality for static layout
    // const handleSheetToggle = () => {
    //   if (isExpanded) {
    //     onSheetCollapse()
    //   } else {
    //     onSheetExpand()
    //   }
    // }

    return (
      <YStack
        flex={flex}
        position="relative"
        elevation={5}
        style={{ transition: 'all 0.5s ease-in-out' }}
        testID="feedback-panel"
        accessibilityLabel={`Feedback panel ${isExpanded ? 'expanded' : 'collapsed'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        {/* Content Container */}
        <YStack
          flex={1}
          zIndex={1}
        >
          {/* Background Image */}
          {/* <Image
            source={glassGradientBackground}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            width="100%"
            height={800}
            resizeMode="stretch"
            zIndex={0}
          /> */}

          <YStack flex={1}>
            {/* Content with ScrollView - YouTube-style delegation */}
            <GestureDetector gesture={nativeGesture}>
              <AnimatedScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  // Add bottom padding to ensure scrollable content (prevents bounce-back)
                  // Only add enough to create minimal scrollable overflow
                  paddingBottom: 30,
                }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                scrollEnabled={scrollEnabled}
                bounces={true}
                testID="feedback-panel-scroll"
              >
                {/* Title */}
                <YStack
                  alignItems="center"
                  backgroundColor="transparent"
                  paddingTop="$5"
                  paddingBottom="$4"
                  paddingHorizontal="$0"
                  testID="analysis-title"
                  accessibilityLabel="Video Analysis title"
                >
                  <Text
                    fontSize="$5"
                    fontWeight="600"
                    color="$color12"
                    textAlign="left"
                  >
                    Speech Analysis For Your Hand Flapping Seagull Performance
                  </Text>
                </YStack>

                {/* Header with Tabs - always visible in static layout */}
                <YStack
                  paddingHorizontal="$0"
                  paddingBottom="$1"
                  testID="sheet-header"
                  accessibilityLabel="Sheet header with navigation tabs"
                >
                  <XStack
                    width="100%"
                    gap="$2"
                    borderBottomWidth={0}
                    borderBottomColor="$borderColor"
                    testID="tab-navigation"
                    accessibilityLabel="Tab navigation"
                    accessibilityRole="tablist"
                    backgroundColor="transparent"
                    //paddingTop="$2"
                  >
                    {(['feedback', 'insights', 'comments'] as const).map((tab) => (
                      <Button
                        key={tab}
                        chromeless
                        flex={1}
                        height={36}
                        backgroundColor={activeTab === tab ? '$color12' : '$color3'}
                        borderRadius="$5"
                        marginVertical="$-1"
                        paddingVertical="$1"
                        paddingHorizontal="$1"
                        hoverStyle={{
                          backgroundColor: '$color2',
                        }}
                        pressStyle={{
                          backgroundColor: '$color6',
                          scale: 0.98,
                        }}
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
                          fontWeight={activeTab === tab ? '400' : '400'}
                          color={activeTab === tab ? '$color1' : '$color'}
                          textTransform="capitalize"
                        >
                          {tab}
                        </Text>
                      </Button>
                    ))}
                  </XStack>
                </YStack>

                <YStack accessibilityLabel={`${activeTab} content area`}>
                  {activeTab === 'feedback' && (
                    <YStack
                      flex={1}
                      testID="feedback-content"
                      accessibilityLabel="Feedback items list"
                      accessibilityRole="list"
                    >
                      <YStack
                        gap="$2"
                        paddingTop="$4"
                      >
                        {sortedFeedbackItems.map((item, index) => {
                          const isHighlighted = selectedFeedbackId === item.id
                          const accessibilityLabel = `${formatTime(item.timestamp)}, ${item.text}, feedback item`

                          return (
                            <FeedbackItemContainer
                              key={item.id}
                              onPress={() => onFeedbackItemPress(item)}
                              {...(item.audioUrl && onSelectAudio
                                ? {
                                    onLongPress: () => onSelectAudio(item.id),
                                  }
                                : {})}
                              testID={`feedback-item-${index + 1}`}
                              accessibilityLabel={accessibilityLabel}
                              data-testid={`feedback-item-${index + 1}`}
                            >
                              <FeedbackMetadata>
                                <TimeLabel data-testid={`feedback-item-${index + 1}-time`}>
                                  {formatTime(item.timestamp)} {item.category}
                                </TimeLabel>

                                {/* Status indicators for SSML and audio processing - positioned at top right */}
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
                              </FeedbackMetadata>

                              <FeedbackText
                                data-testid={`feedback-item-${index + 1}-text`}
                                color={isHighlighted ? '$yellow11' : undefined}
                              >
                                {item.text}
                              </FeedbackText>

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
                            </FeedbackItemContainer>
                          )
                        })}
                      </YStack>
                    </YStack>
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
              </AnimatedScrollView>
            </GestureDetector>
          </YStack>

          {/* Legacy: Non-gesture version (kept for reference, can be removed) */}
          {false && (
            <YStack flex={1}>
              {/* Title */}
              <YStack
                alignItems="center"
                backgroundColor="transparent"
                paddingVertical="$4"
                paddingHorizontal="$4"
                testID="analysis-title"
                accessibilityLabel="Video Analysis title"
              >
                <Text
                  fontSize="$5"
                  fontWeight="600"
                  color="$color12"
                  textAlign="left"
                >
                  Speech Analysis For Your Hand Flapping Seagull Performance
                </Text>
              </YStack>

              {/* Header with Tabs - always visible in static layout */}
              <YStack
                paddingHorizontal="$3"
                testID="sheet-header"
                accessibilityLabel="Sheet header with navigation tabs"
              >
                <XStack
                  borderBottomWidth={1}
                  borderBottomColor="$borderColor"
                  testID="tab-navigation"
                  accessibilityLabel="Tab navigation"
                  accessibilityRole="tablist"
                  backgroundColor="transparent"
                >
                  {(['feedback', 'insights', 'comments'] as const).map((tab) => (
                    <Button
                      key={tab}
                      chromeless
                      flex={1}
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
                        color={activeTab === tab ? '$color' : '$color11'}
                        textTransform="capitalize"
                      >
                        {tab}
                      </Text>
                    </Button>
                  ))}
                </XStack>
              </YStack>

              {/* Content with ScrollView */}
              <AnimatedScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={true}
                scrollEnabled={scrollEnabled}
                bounces={true}
                testID="feedback-panel-scroll"
              >
                <YStack accessibilityLabel={`${activeTab} content area`}>
                  {activeTab === 'feedback' && (
                    <YStack
                      flex={1}
                      testID="feedback-content"
                      accessibilityLabel="Feedback items list"
                      accessibilityRole="list"
                    >
                      <YStack
                        gap="$0"
                        paddingTop="$4"
                      >
                        {sortedFeedbackItems.map((item, index) => {
                          const isHighlighted = selectedFeedbackId === item.id
                          const accessibilityLabel = `${formatTime(item.timestamp)}, ${item.text}, feedback item`

                          return (
                            <FeedbackItemContainer
                              key={item.id}
                              onPress={() => onFeedbackItemPress(item)}
                              {...(item.audioUrl && onSelectAudio
                                ? {
                                    onLongPress: () => onSelectAudio(item.id),
                                  }
                                : {})}
                              testID={`feedback-item-${index + 1}`}
                              accessibilityLabel={accessibilityLabel}
                              data-testid={`feedback-item-${index + 1}`}
                            >
                              <FeedbackMetadata>
                                <TimeLabel data-testid={`feedback-item-${index + 1}-time`}>
                                  {formatTime(item.timestamp)} {item.category}
                                </TimeLabel>

                                {/* Status indicators for SSML and audio processing - positioned at top right */}
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
                              </FeedbackMetadata>

                              <FeedbackText
                                data-testid={`feedback-item-${index + 1}-text`}
                                color={isHighlighted ? '$yellow11' : undefined}
                              >
                                {item.text}
                              </FeedbackText>

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
                            </FeedbackItemContainer>
                          )
                        })}
                      </YStack>
                    </YStack>
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
              </AnimatedScrollView>
            </YStack>
          )}
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
      // TEMP_DISABLED: Sheet expand/collapse for static layout
      // prevProps.onSheetExpand === nextProps.onSheetExpand &&
      // prevProps.onSheetCollapse === nextProps.onSheetCollapse &&
      prevProps.onFeedbackItemPress === nextProps.onFeedbackItemPress &&
      prevProps.onVideoSeek === nextProps.onVideoSeek &&
      prevProps.onRetryFeedback === nextProps.onRetryFeedback &&
      prevProps.onDismissError === nextProps.onDismissError &&
      prevProps.onSelectAudio === nextProps.onSelectAudio
    )
  }
)

FeedbackPanel.displayName = 'FeedbackPanel'
