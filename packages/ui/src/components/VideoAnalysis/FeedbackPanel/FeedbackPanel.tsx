import { log } from '@my/logging'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Hand,
  Heart,
  MessageSquare,
  Mic2,
  Move,
  PersonStanding,
  Send,
  User,
} from '@tamagui/lucide-icons'
import { useAnimationCompletion } from '@ui/hooks/useAnimationCompletion'
import { useFrameDropDetection } from '@ui/hooks/useFrameDropDetection'
import { useRenderProfile } from '@ui/hooks/useRenderProfile'
import { useSmoothnessTracking } from '@ui/hooks/useSmoothnessTracking'
import React, { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, LayoutAnimation, Platform } from 'react-native'
import type { KeyboardEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  AnimatePresence,
  Button,
  Circle,
  Image,
  Input,
  ScrollView,
  Spinner,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui'
import { FeedbackErrorHandler } from '../FeedbackErrorHandler/FeedbackErrorHandler'
import { FeedbackStatusIndicator } from '../FeedbackStatusIndicator/FeedbackStatusIndicator'

// Lazy load VideoAnalysisInsightsV2 to reduce initial bundle size
// Loads only when insights tab is accessed
const LazyVideoAnalysisInsightsV2 = React.lazy(() =>
  import('./VideoAnalysisInsightsV2').then((module) => ({
    default: module.VideoAnalysisInsightsV2,
  }))
)

/**
 * Loading fallback for lazy-loaded insights content
 * Minimal spinner to avoid layout shift during code loading
 */
function InsightsLoadingFallback(): React.ReactElement {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      testID="insights-loading-fallback"
    >
      {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
      <Spinner
        size="small"
        color="$color12"
      />
    </YStack>
  )
}

// Use Animated.FlatList directly for virtualization

// Import the glass gradient background
//const glassGradientBackground = require('../../../../../../apps/expo/assets/glass-gradient-square.png')

/**
 * Styled components for feedback items following coaching session design pattern
 */

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
  lineHeight: '$1',
})

/**
 * Comment container styled component
 */
const CommentContainer = styled(YStack, {
  name: 'CommentContainer',
  gap: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$0',
})

/**
 * Feedback container styled component (matches CommentContainer pattern)
 */
const FeedbackContainer = styled(YStack, {
  name: 'FeedbackContainer',
  gap: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$0',
  borderRadius: '$4',
  cursor: 'pointer',
  accessibilityRole: 'button',
  animation: 'quick',

  pressStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    scale: 0.98,
  },

  hoverStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
})

/**
 * Comment author name text
 */
const CommentAuthorName = styled(Text, {
  name: 'CommentAuthorName',
  fontSize: '$4',
  fontWeight: '600',
  color: '$color12',
})

/**
 * Comment text content
 */
const CommentText = styled(Text, {
  name: 'CommentText',
  fontSize: '$4',
  fontWeight: '400',
  color: '$color12',
  lineHeight: '$1',
})

/**
 * Comment metadata row (time, reply link)
 */
const CommentMetadata = styled(XStack, {
  name: 'CommentMetadata',
  gap: '$2',
  alignItems: 'center',
})

/**
 * Comment action text (reply, view replies)
 */
const CommentActionText = styled(Text, {
  name: 'CommentActionText',
  fontSize: '$3',
  fontWeight: '400',
  color: '$color11',
})

/**
 * Comment likes container
 */
const CommentLikesContainer = styled(XStack, {
  name: 'CommentLikesContainer',
  gap: '$1',
  alignItems: 'center',
})

/**
 * Sort button container
 */
const SortButtonContainer = styled(XStack, {
  name: 'SortButtonContainer',
  gap: '$2',
  paddingHorizontal: '$4',
  paddingTop: '$3',
  paddingBottom: '$2',
})

/**
 * Feedback list container
 */
const FeedbackListContainer = styled(YStack, {
  name: 'FeedbackListContainer',
  gap: '$3',
  paddingHorizontal: '$4',
  paddingTop: '$2',
})

/**
 * Comments list container
 */
const CommentsListContainer = styled(YStack, {
  name: 'CommentsListContainer',
  gap: '$3',
  paddingHorizontal: '$4',
  paddingTop: '$2',
})

/**
 * Comment composer container (sticky footer)
 */
const CommentComposerContainer = styled(YStack, {
  name: 'CommentComposerContainer',
  gap: '$3',
  paddingHorizontal: '$4',
  paddingTop: '$2',
  paddingBottom: '$2',
  borderTopWidth: 1,
  borderColor: '$color8',
  backgroundColor: '$color2',
})

const TabButtonWrapper = styled(YStack, {
  name: 'TabButtonWrapper',
  position: 'relative',
  flex: 1,
  borderRadius: '$6',
  overflow: 'visible',
  alignItems: 'stretch',
  justifyContent: 'center',
})

const TabButtonGlow = styled(YStack, {
  name: 'TabButtonGlow',
  position: 'absolute',
  top: -6,
  bottom: -6,
  left: -4,
  right: -4,
  borderRadius: '$6',
  pointerEvents: 'none',
  borderWidth: 0,
  borderColor: 'rgba(255, 255, 255, 0.22)',
  opacity: 0.85,
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

// Comment item type matching wireframe design
export interface CommentItem {
  id: string
  authorName: string
  avatarUrl?: string // Avatar image URL
  text: string
  timeAgo: string // e.g., "1d", "10 days ago", "2h"
  likes: number
  repliesCount?: number
  parentId?: string | null // For nested replies
  createdAt: number // Timestamp for sorting
}

export interface FeedbackPanelProps {
  flex?: number // Added for flex-based sizing
  isExpanded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  comments?: CommentItem[] // Comments for comments tab
  analysisTitle?: string // AI-generated analysis title
  fullFeedbackText?: string | null // Full AI feedback text for insights "Detailed Summary" section
  isHistoryMode?: boolean // History mode shows real comments; analysis mode shows placeholder
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
  // Comment callbacks
  onCommentSubmit?: (text: string) => void
  // Nested scroll support
  onScrollYChange?: (scrollY: number) => void
  onScrollEndDrag?: () => void
  scrollYShared?: SharedValue<number> // Optional: SharedValue for UI-thread scroll position updates (avoids JS bridge)
  scrollEnabled?: boolean // Control scroll enabled state from parent (fallback for web/tests)
  scrollEnabledShared?: SharedValue<boolean> // Shared value for UI-thread scroll control (native only)
  scrollGestureRef?: React.RefObject<any> // Ref for this panel's scroll gesture (for blocksExternalGesture)
  onMinimizeVideo?: () => void
}

export const FeedbackPanel = memo(
  function FeedbackPanel({
    flex,
    isExpanded,
    activeTab,
    feedbackItems,
    comments = [],
    analysisTitle,
    fullFeedbackText,
    isHistoryMode = false,
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
    onCommentSubmit,
    onScrollYChange,
    onScrollEndDrag,
    scrollYShared, // Optional: SharedValue for UI-thread scroll position updates
    scrollEnabled = true, // Default to enabled (fallback for web/tests)
    scrollEnabledShared, // Shared value for UI-thread control (native only)
    scrollGestureRef,
    onMinimizeVideo,
  }: FeedbackPanelProps) {
    // Comment sorting state
    const [commentSort, setCommentSort] = useState<'top' | 'new'>('top')

    // Comment input state
    const [commentInput, setCommentInput] = useState('')

    const { bottom: safeAreaBottom } = useSafeAreaInsets()
    const scrollViewRef = useRef<any>(null)
    const [keyboardHeight, setKeyboardHeight] = useState(0)

    // PERFORMANCE FIX: Use useAnimatedProps for zero-latency scroll control
    // Eliminates 16-50ms JS-thread delay that caused scroll gesture to activate before blocking
    // Only use on native when shared value is provided
    const animatedScrollProps = scrollEnabledShared
      ? useAnimatedProps(() => {
          'worklet'
          const enabled = scrollEnabledShared.value
          // NOTE: Commented out - runOnJS() causes bridge overhead on every scroll state change
          // runOnJS(log.debug)('FeedbackPanel', 'animatedProps scrollEnabled', { enabled })
          return {
            scrollEnabled: enabled,
          }
        }, [scrollEnabledShared])
      : undefined

    // Log scroll state changes
    useEffect(() => {
      log.debug('FeedbackPanel', 'Scroll state update', {
        scrollEnabled,
        hasSharedValue: !!scrollEnabledShared,
        hasAnimatedProps: !!animatedScrollProps,
      })
    }, [scrollEnabled, scrollEnabledShared, animatedScrollProps])

    // Feedback filter state
    const [feedbackFilter, setFeedbackFilter] = useState<
      'all' | 'voice' | 'posture' | 'grip' | 'movement'
    >('all')

    // Track previous activeTab to detect actual tab switches
    const previousActiveTabRef = useRef(activeTab)
    const tabActuallyChanged = previousActiveTabRef.current !== activeTab

    // Update ref after checking if tab changed (for next render comparison)
    useEffect(() => {
      previousActiveTabRef.current = activeTab
    }, [activeTab])

    // Listen to keyboard events to adjust comment composer position
    useEffect(() => {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e: KeyboardEvent) => {
          setKeyboardHeight(e.endCoordinates.height)
        }
      )
      const keyboardWillHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0)
        }
      )

      return () => {
        keyboardWillShowListener.remove()
        keyboardWillHideListener.remove()
      }
    }, [])

    // Memoize animation styles to prevent object recreation on every render
    const tabTransitionEnterStyle = useMemo(() => ({ opacity: 0, y: 10 }), [])
    const tabTransitionExitStyle = useMemo(() => ({ opacity: 0, y: -10 }), [])

    // PERFORMANCE: Track scroll position on UI thread to avoid JS bridge overhead
    // If scrollYShared is provided, update it directly in worklet (zero latency)
    // Otherwise, fall back to JS callback (throttled via useAnimatedReaction)
    const internalScrollY = useSharedValue(0)

    // Sync internal scroll position to parent's SharedValue (if provided) on UI thread
    useAnimatedReaction(
      () => internalScrollY.value,
      (currentY) => {
        'worklet'
        if (scrollYShared) {
          scrollYShared.value = currentY
        }
      },
      [scrollYShared]
    )

    // Fallback: Call JS callback only when scroll ends (if no SharedValue provided)
    // This avoids calling runOnJS on every scroll event
    useAnimatedReaction(
      () => internalScrollY.value,
      (currentY, previousY) => {
        'worklet'
        // Only call JS callback if no SharedValue is provided and value changed significantly
        // This is a fallback for web/compatibility - prefer scrollYShared for native
        if (!scrollYShared && onScrollYChange && previousY !== null) {
          // Throttle: only update if change is significant (> 1px) to reduce bridge calls
          if (Math.abs(currentY - previousY) > 1) {
            runOnJS(onScrollYChange)(currentY)
          }
        }
      },
      [scrollYShared, onScrollYChange]
    )

    // Scroll handler - updates SharedValue directly on UI thread (no JS bridge)
    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        'worklet'
        const scrollY = event.contentOffset.y
        // Update SharedValue directly on UI thread (zero latency, no bridge)
        internalScrollY.value = scrollY
      },
      onEndDrag: () => {
        'worklet'
        // onScrollEndDrag is called infrequently, so runOnJS is acceptable here
        if (onScrollEndDrag) {
          runOnJS(onScrollEndDrag)()
        }
      },
    })

    const isWeb = Platform.OS === 'web'
    const isAndroid = Platform.OS === 'android'
    const shouldShowCommentComposer = activeTab === 'comments' && isHistoryMode
    const scrollBottomPadding = shouldShowCommentComposer ? 16 : 30

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
      logOnly: true,
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

    const formatTime = useCallback((milliseconds: number) => {
      // Convert milliseconds to seconds for duration formatting
      const totalSeconds = Math.floor(milliseconds / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }, [])

    // Sort and filter feedback items
    const sortedFeedbackItems = useMemo(() => {
      let filtered = feedbackItems

      // Filter by category if not 'all'
      if (feedbackFilter !== 'all') {
        filtered = filtered.filter((item) => item.category === feedbackFilter)
      }

      // Sort chronologically
      return [...filtered].sort((a, b) => a.timestamp - b.timestamp)
    }, [feedbackItems, feedbackFilter])

    // Sort and filter comments based on sort mode
    const sortedComments = useMemo(() => {
      const filtered = comments.filter((c) => !c.parentId) // Only top-level comments
      if (commentSort === 'top') {
        return [...filtered].sort((a, b) => b.likes - a.likes)
      }
      // 'new' - sort by createdAt descending
      return [...filtered].sort((a, b) => b.createdAt - a.createdAt)
    }, [comments, commentSort])

    // Format count for display (similar to SocialIcons)
    const formatCount = useCallback((count: number): string => {
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`
      }
      return count.toString()
    }, [])

    // Get feedback type icon
    const getFeedbackTypeIcon = useCallback((type: FeedbackItem['type']) => {
      switch (type) {
        case 'positive':
          return CheckCircle
        case 'correction':
          return AlertCircle
        case 'suggestion':
          return MessageSquare
        default:
          return MessageSquare
      }
    }, [])

    // Get feedback category icon
    const getFeedbackCategoryIcon = useCallback((category: FeedbackItem['category']) => {
      // Handle case-insensitive matching for backend categories (Posture, Movement, Speech) and UI categories (posture, movement, voice)
      const normalizedCategory = category.toLowerCase()
      switch (normalizedCategory) {
        case 'posture':
          return PersonStanding
        case 'movement':
          return Move
        case 'grip':
          return Hand
        case 'voice':
        case 'speech':
        case 'vocal variety':
          return Mic2
        default:
          return null
      }
    }, [])

    // Handle comment submission
    const handleCommentSubmit = useCallback(() => {
      if (commentInput.trim() && onCommentSubmit) {
        onCommentSubmit(commentInput.trim())
        setCommentInput('')
      }
    }, [commentInput, onCommentSubmit])

    const keyExtractor = useCallback((item: FeedbackItem) => item.id, [])

    // Render comment item
    const renderCommentItem = useCallback(
      (comment: CommentItem, index: number) => {
        return (
          <CommentContainer
            key={comment.id}
            testID={`comment-${index + 1}`}
          >
            <XStack
              gap="$3"
              alignItems="flex-start"
            >
              {/* Avatar */}
              {comment.avatarUrl ? (
                <Circle
                  size={32}
                  overflow="hidden"
                  testID={`comment-${index + 1}-avatar`}
                  accessibilityLabel={`${comment.authorName} avatar`}
                >
                  <Image
                    source={{ uri: comment.avatarUrl }}
                    width={32}
                    height={32}
                    borderRadius={16}
                    testID={`comment-${index + 1}-avatar-image`}
                    accessibilityLabel={`${comment.authorName} avatar image`}
                  />
                </Circle>
              ) : (
                <Circle
                  size={32}
                  backgroundColor="$color5"
                  alignItems="center"
                  justifyContent="center"
                  testID={`comment-${index + 1}-avatar`}
                  accessibilityLabel={`${comment.authorName} avatar`}
                >
                  <User
                    size={18}
                    color="$color11"
                  />
                </Circle>
              )}

              {/* Comment content */}
              <YStack
                flex={1}
                gap="$1"
              >
                {/* Author name and likes */}
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <CommentAuthorName>{comment.authorName}</CommentAuthorName>
                  <CommentLikesContainer>
                    <Heart
                      size={14}
                      color="$color11"
                    />
                    <Text
                      fontSize="$3"
                      color="$color11"
                    >
                      {formatCount(comment.likes)}
                    </Text>
                  </CommentLikesContainer>
                </XStack>

                {/* Comment text */}
                <CommentText>{comment.text}</CommentText>

                {/* Metadata: time, reply, view replies */}
                <CommentMetadata>
                  <CommentActionText>{comment.timeAgo}</CommentActionText>
                  <CommentActionText
                    onPress={() => {
                      // TODO: Handle reply action
                    }}
                    cursor="pointer"
                    testID={`comment-${index + 1}-reply`}
                  >
                    reply
                  </CommentActionText>
                  {comment.repliesCount !== undefined && comment.repliesCount > 0 && (
                    <XStack
                      gap="$1"
                      alignItems="center"
                    >
                      <CommentActionText
                        onPress={() => {
                          // TODO: Handle view replies action
                        }}
                        cursor="pointer"
                        testID={`comment-${index + 1}-view-replies`}
                      >
                        View replies ({comment.repliesCount})
                      </CommentActionText>
                      <ChevronDown
                        size={14}
                        color="$color11"
                      />
                    </XStack>
                  )}
                </CommentMetadata>
              </YStack>
            </XStack>
          </CommentContainer>
        )
      },
      [formatCount]
    )

    // Render feedback item node (must be defined before renderFeedbackContent)
    const renderFeedbackItemNode = useCallback(
      (item: FeedbackItem, index: number) => {
        const isHighlighted = selectedFeedbackId === item.id
        const accessibilityLabel = `${formatTime(item.timestamp)}, ${item.text}, feedback item`
        const TypeIcon = getFeedbackTypeIcon(item.type)
        const CategoryIcon = getFeedbackCategoryIcon(item.category)

        return (
          <FeedbackContainer
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
            <XStack
              gap="$3"
              alignItems="flex-start"
            >
              {/* Type icon */}
              <Circle
                size={32}
                alignItems="center"
                justifyContent="center"
                testID={`feedback-item-${index + 1}-icon`}
                accessibilityLabel={`${item.type} feedback`}
              >
                {CategoryIcon !== null ? (
                  <CategoryIcon
                    size={22}
                    color={isHighlighted ? '$yellow11' : '$color11'}
                  />
                ) : (
                  <TypeIcon
                    size={18}
                    color={isHighlighted ? '$yellow11' : '$color11'}
                  />
                )}
              </Circle>

              {/* Feedback content */}
              <YStack
                flex={1}
                gap="$1"
              >
                {/* Header: time, category, and status */}
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <XStack
                    gap="$2"
                    alignItems="center"
                    flex={1}
                  >
                    <TimeLabel data-testid={`feedback-item-${index + 1}-time`}>
                      {formatTime(item.timestamp)}
                    </TimeLabel>
                    <Text
                      fontSize="$2"
                      fontWeight="500"
                      color="$color11"
                      textTransform="capitalize"
                    >
                      {item.category}
                    </Text>
                  </XStack>

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

                {/* Feedback text */}
                <FeedbackText
                  data-testid={`feedback-item-${index + 1}-text`}
                  color={isHighlighted ? '$yellow11' : undefined}
                >
                  {item.text}
                </FeedbackText>

                {/* Error handler */}
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
            </XStack>
          </FeedbackContainer>
        )
      },
      [
        formatTime,
        getFeedbackTypeIcon,
        getFeedbackCategoryIcon,
        onDismissError,
        onFeedbackItemPress,
        onRetryFeedback,
        onSelectAudio,
        selectedFeedbackId,
      ]
    )

    // Render feedback tab content
    const renderFeedbackContent = useCallback(
      () => (
        <YStack
          key="feedback-content"
          paddingTop="$2"
          testID="feedback-content"
          accessibilityLabel="Feedback content area"
        >
          {/* Filter buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            paddingHorizontal="$0"
            testID="feedback-filter-scroll"
          >
            <SortButtonContainer>
              {(['all', 'voice', 'posture', 'grip', 'movement'] as const).map((filter) => (
                <Button
                  key={filter}
                  chromeless
                  size="$2"
                  height={32}
                  backgroundColor={feedbackFilter === filter ? '$color12' : '$color3'}
                  borderRadius="$4"
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  flexShrink={0}
                  onPress={() => setFeedbackFilter(filter)}
                  testID={`filter-${filter}`}
                  accessibilityLabel={`Filter by ${filter}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: feedbackFilter === filter }}
                >
                  <Text
                    fontSize="$3"
                    fontWeight={feedbackFilter === filter ? '600' : '400'}
                    color={feedbackFilter === filter ? '$color1' : '$color11'}
                    textTransform="capitalize"
                  >
                    {filter}
                  </Text>
                </Button>
              ))}
            </SortButtonContainer>
          </ScrollView>

          {/* Feedback list */}
          <FeedbackListContainer>
            {sortedFeedbackItems.length > 0 ? (
              sortedFeedbackItems.map((item, index) => renderFeedbackItemNode(item, index))
            ) : (
              <YStack
                padding="$4"
                alignItems="center"
                justifyContent="center"
                gap="$2"
                testID="no-feedback"
                accessibilityLabel="No feedback available"
              >
                <Text
                  fontSize="$4"
                  color="$color10"
                  textAlign="center"
                >
                  {feedbackFilter === 'all'
                    ? 'Feedback will appear here once the analysis completes.'
                    : `No ${feedbackFilter} feedback available.`}
                </Text>
              </YStack>
            )}
          </FeedbackListContainer>
        </YStack>
      ),
      [feedbackFilter, sortedFeedbackItems, renderFeedbackItemNode]
    )

    // Render insights tab content with lazy loading
    // Only loads component code when tab is accessed
    const renderInsightsContent = useCallback(
      () => (
        <Suspense fallback={<InsightsLoadingFallback />}>
          <LazyVideoAnalysisInsightsV2
            key="insights-content"
            fullFeedbackText={fullFeedbackText}
            testID="insights-content"
          />
        </Suspense>
      ),
      [fullFeedbackText]
    )

    // Render comments tab content
    const renderCommentsContent = useCallback(() => {
      if (!isHistoryMode) {
        return (
          <YStack
            key="comments-content"
            paddingTop="$2"
            testID="comments-content"
            accessibilityLabel="Comments content area"
          >
            <CommentsListContainer>
              <YStack
                padding="$4"
                alignItems="center"
                justifyContent="center"
                gap="$2"
                testID="comments-analysis-placeholder"
                accessibilityLabel="Comments unavailable during analysis"
              >
                <Text
                  fontSize="$4"
                  color="$color11"
                  textAlign="center"
                >
                  You are eager and curious. That's great. Right attitude!
                </Text>
                <Text
                  fontSize="$4"
                  color="$color11"
                  textAlign="center"
                >
                  Go to History & Progress to see the comments for this video to get a better
                  understanding for the idea. ;)
                </Text>
              </YStack>
            </CommentsListContainer>
          </YStack>
        )
      }

      return (
        <YStack
          key="comments-content"
          paddingTop="$2"
          testID="comments-content"
          accessibilityLabel="Comments content area"
        >
          {/* Sort buttons */}
          <SortButtonContainer>
            <Button
              chromeless
              size="$2"
              height={32}
              backgroundColor={commentSort === 'top' ? '$color12' : '$color3'}
              borderRadius="$4"
              paddingHorizontal="$3"
              paddingVertical="$1"
              onPress={() => setCommentSort('top')}
              testID="sort-top"
              accessibilityLabel="Sort by top comments"
              accessibilityRole="button"
              accessibilityState={{ selected: commentSort === 'top' }}
            >
              <Text
                fontSize="$3"
                fontWeight={commentSort === 'top' ? '600' : '600'}
                color={commentSort === 'top' ? '$color1' : '$color11'}
              >
                Top
              </Text>
            </Button>
            <Button
              chromeless
              size="$2"
              height={32}
              backgroundColor={commentSort === 'new' ? '$color12' : '$color3'}
              borderRadius="$4"
              paddingHorizontal="$3"
              paddingVertical="$1"
              onPress={() => setCommentSort('new')}
              testID="sort-new"
              accessibilityLabel="Sort by newest comments"
              accessibilityRole="button"
              accessibilityState={{ selected: commentSort === 'new' }}
            >
              <Text
                fontSize="$3"
                fontWeight={commentSort === 'new' ? '600' : '400'}
                color={commentSort === 'new' ? '$color1' : '$color11'}
              >
                New
              </Text>
            </Button>
          </SortButtonContainer>

          {/* Comments list */}
          <CommentsListContainer>
            {sortedComments.length > 0 ? (
              sortedComments.map((comment, index) => renderCommentItem(comment, index))
            ) : (
              <YStack
                padding="$4"
                alignItems="center"
                justifyContent="center"
                gap="$2"
                testID="no-comments"
                accessibilityLabel="No comments available"
              >
                <Text
                  fontSize="$4"
                  color="$color10"
                  textAlign="center"
                >
                  No comments yet. Be the first to comment!
                </Text>
              </YStack>
            )}
          </CommentsListContainer>
        </YStack>
      )
    }, [commentSort, isHistoryMode, sortedComments, renderCommentItem])

    const handleCommentInputFocus = useCallback((): void => {
      onMinimizeVideo?.()
      // Scroll to end when input is focused to ensure it's visible above keyboard
      // KeyboardAvoidingView handles main positioning; this ensures composer is in view
      if (scrollViewRef.current) {
        setTimeout(() => {
          const ref = scrollViewRef.current
          // Try scrollToEnd first (works for both ScrollView and FlatList)
          if (ref.scrollToEnd) {
            ref.scrollToEnd({ animated: true })
          }
          // Fallback: scroll to large offset (effectively to end)
          else if (ref.scrollTo) {
            ref.scrollTo({ y: 999999, animated: true })
          }
        }, 150)
      }
    }, [onMinimizeVideo])

    const renderCommentComposer = useCallback(() => {
      // Android gesture navigation needs additional bottom padding
      // safeAreaBottom may be 0 on Android with gesture navigation, so ensure minimum padding
      const androidGesturePadding = Platform.OS === 'android' ? 20 : 0
      const basePadding = safeAreaBottom > 0 ? safeAreaBottom - 12 : 0
      const bottomPadding = Math.max(
        basePadding + androidGesturePadding,
        Platform.OS === 'android' ? 20 : 8
      )

      return (
        <CommentComposerContainer
          paddingBottom={bottomPadding}
          marginBottom={keyboardHeight > 0 ? keyboardHeight - safeAreaBottom : 0}
          accessibilityLabel="Comment composer"
          testID="comment-composer"
        >
          <XStack
            gap="$2"
            alignItems="center"
            testID="comment-input-container"
          >
            <Input
              flex={1}
              placeholder="Share your thoughts"
              value={commentInput}
              onChangeText={setCommentInput}
              onFocus={handleCommentInputFocus}
              backgroundColor="$color3"
              borderColor="$color5"
              borderRadius="$3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              height={40}
              fontSize="$4"
              color="$color12"
              placeholderTextColor="$color10"
              testID="comment-input"
              accessibilityLabel="Comment input field"
              onSubmitEditing={handleCommentSubmit}
            />
            <Button
              chromeless
              size="$4"
              width={40}
              height={40}
              backgroundColor={commentInput.trim().length > 0 ? '$purple6' : 'transparent'}
              borderRadius="$4"
              padding="$0"
              hoverStyle={{
                backgroundColor: '$purple6',
                opacity: 0.9,
                scale: 1.06,
              }}
              pressStyle={{
                backgroundColor: '$purple4',
                opacity: 0.85,
                scale: 0.93,
              }}
              onPress={handleCommentSubmit}
              disabled={!commentInput.trim()}
              testID="comment-send-button"
              accessibilityLabel="Send comment"
              accessibilityRole="button"
            >
              <Send
                size={18}
                color="$color11"
              />
            </Button>
          </XStack>
        </CommentComposerContainer>
      )
    }, [
      commentInput,
      handleCommentSubmit,
      handleCommentInputFocus,
      keyboardHeight,
      safeAreaBottom,
      setCommentInput,
    ])

    // Render active tab content with conditional animation
    const renderTabContent = useCallback(() => {
      let content: React.ReactNode
      if (activeTab === 'feedback') {
        content = renderFeedbackContent()
      } else if (activeTab === 'insights') {
        content = renderInsightsContent()
      } else {
        content = renderCommentsContent()
      }

      // Apply animation props only when tab actually changed
      if (tabActuallyChanged) {
        return (
          <AnimatePresence>
            <YStack
              animation="quick"
              enterStyle={tabTransitionEnterStyle}
              exitStyle={tabTransitionExitStyle}
            >
              {content}
            </YStack>
          </AnimatePresence>
        )
      }

      return content
    }, [
      activeTab,
      tabActuallyChanged,
      renderFeedbackContent,
      renderInsightsContent,
      renderCommentsContent,
      tabTransitionEnterStyle,
      tabTransitionExitStyle,
    ])

    const renderListHeader = useCallback(() => {
      return (
        <YStack paddingHorizontal="$0">
          <YStack
            alignItems="center"
            backgroundColor="transparent"
            paddingTop="$4"
            paddingBottom="$4"
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
              {analysisTitle || 'Speech Analysis For Your Hand Flapping Seagull Performance'}
            </Text>
          </YStack>

          <YStack
            paddingHorizontal="$4"
            paddingBottom="$1"
            testID="sheet-header"
            accessibilityLabel="Sheet header with navigation tabs"
          >
            <XStack
              gap="$2"
              width="100%"
              borderBottomWidth={0}
              borderBottomColor="$borderColor"
              testID="tab-navigation"
              accessibilityLabel="Tab navigation"
              accessibilityRole="tablist"
              backgroundColor="transparent"
            >
              {(['feedback', 'insights', 'comments'] as const).map((tab) => {
                const isActive = activeTab === tab

                return (
                  <TabButtonWrapper
                    key={tab}
                    testID={isActive ? `tab-${tab}-wrapper-active` : undefined}
                  >
                    {isActive ? <TabButtonGlow testID={`tab-${tab}-glow`} /> : null}
                    <Button
                      chromeless
                      flex={1}
                      height={32}
                      backgroundColor={isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
                      borderRadius="$6"
                      marginVertical="$-1"
                      paddingVertical="$1"
                      paddingHorizontal="$1"
                      animation="quick"
                      hoverStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        opacity: 0.85,
                      }}
                      pressStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        opacity: 0.75,
                        scale: 0.97,
                      }}
                      onPress={() => onTabChange(tab)}
                      testID={`tab-${tab}`}
                      accessibilityLabel={`${tab} tab`}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      accessibilityHint={`Switch to ${tab} view`}
                      data-testid={`tab-${tab}`}
                    >
                      <Text
                        fontSize="$4"
                        fontWeight={isActive ? '600' : '400'}
                        color={isActive ? '$color12' : '$color11'}
                        textTransform="capitalize"
                        animation="quick"
                      >
                        {tab}
                      </Text>
                    </Button>
                  </TabButtonWrapper>
                )
              })}
            </XStack>
          </YStack>

          {renderTabContent()}
        </YStack>
      )
    }, [activeTab, onTabChange, renderTabContent, analysisTitle])

    const renderFeedbackItem = useCallback(
      ({ item, index }: { item: FeedbackItem; index: number }) =>
        renderFeedbackItemNode(item, index),
      [renderFeedbackItemNode]
    )

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
            {/* Content with virtualized list - YouTube-style delegation */}
            <YStack flex={1}>
              {isWeb ? (
                <Animated.ScrollView
                  ref={scrollViewRef}
                  style={{ paddingBottom: scrollBottomPadding }}
                  testID="feedback-panel-scroll"
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                >
                  {renderListHeader()}
                </Animated.ScrollView>
              ) : isAndroid ? (
                // Android: Wrap FlatList in GestureDetector to coordinate with parent rootPan
                // PERFORMANCE FIX: Use Gesture.Native().withRef() to enable blocksExternalGesture
                <GestureDetector
                  gesture={
                    scrollGestureRef ? Gesture.Native().withRef(scrollGestureRef) : Gesture.Native()
                  }
                >
                  <Animated.FlatList<FeedbackItem>
                    ref={scrollViewRef}
                    data={[]}
                    extraData={selectedFeedbackId}
                    keyExtractor={keyExtractor}
                    renderItem={renderFeedbackItem}
                    ListHeaderComponent={renderListHeader}
                    ItemSeparatorComponent={undefined}
                    ListEmptyComponent={undefined}
                    contentContainerStyle={{
                      paddingHorizontal: 0,
                      paddingBottom: scrollBottomPadding,
                    }}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator
                    indicatorStyle="white"
                    scrollEnabled={scrollEnabled}
                    // PERFORMANCE FIX: Use animatedProps for zero-latency scroll control when shared value provided
                    // @ts-ignore - animatedProps not in FlatList types but supported by Reanimated
                    animatedProps={animatedScrollProps}
                    nestedScrollEnabled={true}
                    bounces
                    testID="feedback-panel-scroll"
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                  />
                </GestureDetector>
              ) : (
                // iOS: Use Gesture.Native().withRef() to enable blocksExternalGesture
                <GestureDetector
                  gesture={
                    scrollGestureRef ? Gesture.Native().withRef(scrollGestureRef) : Gesture.Native()
                  }
                >
                  <YStack
                    flex={1}
                    testID={activeTab === 'feedback' ? 'feedback-content' : undefined}
                    accessibilityLabel={
                      activeTab === 'feedback' ? 'feedback content area' : undefined
                    }
                    accessibilityRole={activeTab === 'feedback' ? 'list' : undefined}
                  >
                    <Animated.FlatList<FeedbackItem>
                      ref={scrollViewRef}
                      data={[]}
                      extraData={selectedFeedbackId}
                      keyExtractor={keyExtractor}
                      renderItem={renderFeedbackItem}
                      ListHeaderComponent={renderListHeader}
                      ItemSeparatorComponent={undefined}
                      ListEmptyComponent={undefined}
                      contentContainerStyle={{
                        paddingHorizontal: 0,
                        paddingBottom: scrollBottomPadding,
                      }}
                      onScroll={scrollHandler}
                      scrollEventThrottle={16}
                      showsVerticalScrollIndicator
                      indicatorStyle="white"
                      scrollEnabled={scrollEnabled}
                      // PERFORMANCE FIX: Use animatedProps for zero-latency scroll control when shared value provided
                      // @ts-ignore - animatedProps not in FlatList types but supported by Reanimated
                      animatedProps={animatedScrollProps}
                      nestedScrollEnabled={true}
                      bounces
                      testID="feedback-panel-scroll"
                      initialNumToRender={8}
                      maxToRenderPerBatch={8}
                      windowSize={5}
                      removeClippedSubviews
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="interactive"
                    />
                  </YStack>
                </GestureDetector>
              )}
            </YStack>
            {shouldShowCommentComposer ? renderCommentComposer() : null}
          </YStack>

          {/* Legacy ScrollView variant removed */}
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
      JSON.stringify(prevProps.comments) === JSON.stringify(nextProps.comments) &&
      prevProps.analysisTitle === nextProps.analysisTitle &&
      prevProps.fullFeedbackText === nextProps.fullFeedbackText &&
      // Ignore currentVideoTime and videoDuration as they change frequently but don't affect visual state
      prevProps.onTabChange === nextProps.onTabChange &&
      prevProps.isHistoryMode === nextProps.isHistoryMode &&
      // TEMP_DISABLED: Sheet expand/collapse for static layout
      // prevProps.onSheetExpand === nextProps.onSheetExpand &&
      // prevProps.onSheetCollapse === nextProps.onSheetCollapse &&
      prevProps.onFeedbackItemPress === nextProps.onFeedbackItemPress &&
      prevProps.onVideoSeek === nextProps.onVideoSeek &&
      prevProps.onRetryFeedback === nextProps.onRetryFeedback &&
      prevProps.onDismissError === nextProps.onDismissError &&
      prevProps.onSelectAudio === nextProps.onSelectAudio &&
      prevProps.onScrollYChange === nextProps.onScrollYChange &&
      prevProps.onScrollEndDrag === nextProps.onScrollEndDrag &&
      prevProps.scrollYShared === nextProps.scrollYShared &&
      prevProps.scrollEnabled === nextProps.scrollEnabled &&
      prevProps.scrollEnabledShared === nextProps.scrollEnabledShared &&
      prevProps.scrollGestureRef === nextProps.scrollGestureRef &&
      prevProps.onMinimizeVideo === nextProps.onMinimizeVideo
    )
  }
)

FeedbackPanel.displayName = 'FeedbackPanel'
