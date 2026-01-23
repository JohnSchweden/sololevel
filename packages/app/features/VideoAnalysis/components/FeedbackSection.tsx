//import { log } from '@my/logging'
import type { CoachMode } from '@my/config'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import { YStack } from 'tamagui'

import { FeedbackPanel } from '@ui/components/VideoAnalysis'

import { getMockComments } from '@app/mocks/comments'
import { useVoicePreferencesStore } from '@app/stores/voicePreferences'

import {
  getFeedbackPanelCommandState,
  useFeedbackPanel,
  useFeedbackPanelCommandStore,
} from '../hooks/useFeedbackPanel'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import type { FeedbackPanelItem } from '../types'

interface FeedbackSectionProps {
  feedbackItems: FeedbackPanelItem[]
  analysisTitle?: string // AI-generated analysis title
  fullFeedbackText?: string | null // Full AI feedback text for insights "Detailed Summary" section
  fullFeedbackRating?: 'up' | 'down' | null // User rating for the full feedback text
  isHistoryMode?: boolean
  voiceMode?: CoachMode // Voice mode for UI text (roast/zen/lovebomb)
  // selectedFeedbackId: string | null - REMOVED: Subscribed directly from store
  currentVideoTime: number
  videoDuration: number
  // errors: Record<string, string> - REMOVED: Subscribed directly from store
  // audioUrls: Record<string, string> - REMOVED: Subscribed directly from store
  // onTabChange removed - handled internally by feedbackPanel.setActiveTab
  // onExpand removed - handled internally by feedbackPanel.expand
  onCollapse: () => void
  onItemPress: (item: FeedbackPanelItem) => void
  onSeek: (time: number) => void
  onRetryFeedback: (feedbackId: string) => void
  onDismissError: (feedbackId: string) => void
  onSelectAudio: (feedbackId: string) => void
  onFeedbackRatingChange: (feedbackId: string, rating: 'up' | 'down' | null) => void
  onFullFeedbackRatingChange: (rating: 'up' | 'down' | null) => void
  onScrollYChange?: (scrollY: number) => void
  onScrollEndDrag?: () => void
  scrollYShared?: any // SharedValue<number> for UI-thread scroll position updates
  scrollEnabled?: boolean
  scrollEnabledShared?: any // SharedValue<boolean> from gesture controller
  scrollGestureRef?: React.RefObject<any>
  onMinimizeVideo?: () => void
}

export const FeedbackSection = memo(function FeedbackSection({
  feedbackItems,
  analysisTitle,
  fullFeedbackText,
  fullFeedbackRating: initialFullFeedbackRating,
  isHistoryMode = false,
  voiceMode = 'roast',
  // selectedFeedbackId, - REMOVED: Subscribed directly from store
  currentVideoTime,
  videoDuration,
  // errors, - REMOVED: Subscribed directly from store
  // audioUrls, - REMOVED: Subscribed directly from store
  // onTabChange, - REMOVED: handled internally by feedbackPanel.setActiveTab
  // TEMP_DISABLED: Sheet expand/collapse for static layout
  // onExpand, - REMOVED: handled internally by feedbackPanel.expand
  // onCollapse,
  onItemPress,
  onSeek,
  onRetryFeedback,
  onDismissError,
  onSelectAudio,
  onFeedbackRatingChange,
  onFullFeedbackRatingChange,
  onScrollYChange,
  onScrollEndDrag,
  scrollYShared,
  scrollEnabled,
  scrollEnabledShared,
  scrollGestureRef,
  onMinimizeVideo,
}: FeedbackSectionProps): ReactElement {
  // PERFORMANCE FIX: Direct subscription to highlighted feedback state
  // Eliminates VideoAnalysisScreen re-renders when feedback selection changes
  const selectedFeedbackId = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.highlightedFeedbackId : null
  )

  // Optimistic state for full feedback rating
  const [optimisticFullFeedbackRating, setOptimisticFullFeedbackRating] = useState<
    'up' | 'down' | null
  >(initialFullFeedbackRating ?? null)

  // Sync optimistic state when initial rating changes (e.g., after loading from DB)
  useEffect(() => {
    if (initialFullFeedbackRating !== undefined) {
      setOptimisticFullFeedbackRating(initialFullFeedbackRating)
    }
  }, [initialFullFeedbackRating])

  // Optimistic state for individual feedback ratings (keyed by feedbackId)
  const [optimisticFeedbackRatings, setOptimisticFeedbackRatings] = useState<
    Record<string, 'up' | 'down' | null>
  >({})

  // PERFORMANCE FIX: Direct subscription to feedback panel state
  // Eliminates VideoAnalysisScreen re-renders when panel state changes
  const feedbackPanel = useFeedbackPanel()
  const setActiveTab = feedbackPanel.setActiveTab
  // Subscribe only to command value (not the object with clear function)
  // This prevents infinite loops from object reference changes
  const command = useFeedbackPanelCommandStore((state) => state.command)
  const processedTokenRef = useRef<number | null>(null)

  // PERFORMANCE FIX: Direct subscription to feedback audio state
  // Eliminates VideoAnalysisScreen re-renders when audio URLs/errors change
  const errors = useFeedbackAudioStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.errors : {}
  )
  const audioUrls = useFeedbackAudioStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.audioUrls : {}
  )

  // Get voice mode for comments (fallback to prop, then store, then 'roast')
  const voiceModeFromStore = useVoicePreferencesStore((s) => s.mode)
  const effectiveVoiceMode = voiceMode || voiceModeFromStore || 'roast'

  // Generate mock comments based on voice mode
  const mockCommentsData = useMemo(() => getMockComments(effectiveVoiceMode), [effectiveVoiceMode])

  const preparedItems = useMemo(
    () =>
      feedbackItems.map((item) => ({
        ...item,
        audioUrl: audioUrls[item.id],
        audioError: errors[item.id],
      })),
    [audioUrls, errors, feedbackItems]
  )

  // Process command bus requests - use token to avoid reprocessing same command
  useEffect(() => {
    if (!command) {
      // Reset processed token when command is cleared to allow reprocessing
      processedTokenRef.current = null
      return
    }
    // Skip if we've already processed this command token
    if (processedTokenRef.current === command.token) {
      return
    }
    processedTokenRef.current = command.token
    setActiveTab(command.tab)
    // Clear command after processing
    getFeedbackPanelCommandState().clear()
  }, [command, setActiveTab])

  // Wrap rating handlers with optimistic updates
  const handleFeedbackRatingChange = useCallback(
    (feedbackId: string, rating: 'up' | 'down' | null) => {
      // Optimistic update
      setOptimisticFeedbackRatings((prev) => ({
        ...prev,
        [feedbackId]: rating,
      }))
      // Call actual handler
      onFeedbackRatingChange(feedbackId, rating)
    },
    [onFeedbackRatingChange]
  )

  const handleFullFeedbackRatingChange = useCallback(
    (rating: 'up' | 'down' | null) => {
      // Optimistic update
      setOptimisticFullFeedbackRating(rating)
      // Call actual handler
      onFullFeedbackRatingChange(rating)
    },
    [onFullFeedbackRatingChange]
  )

  // Merge optimistic ratings into feedback items
  const feedbackItemsWithRatings = useMemo(
    () =>
      preparedItems.map((item) => ({
        ...item,
        // FIX: Use 'in' operator to check if key exists, not ?? which treats null as falsy
        // This allows null (clearing rating) to override the DB value
        userRating:
          item.id in optimisticFeedbackRatings
            ? optimisticFeedbackRatings[item.id]
            : (item.userRating ?? null),
      })),
    [preparedItems, optimisticFeedbackRatings]
  )

  return (
    <YStack
      height="100%"
      width="100%"
      position="relative"
    >
      <FeedbackPanel
        flex={1}
        isExpanded={true}
        activeTab={feedbackPanel.activeTab}
        feedbackItems={feedbackItemsWithRatings}
        analysisTitle={analysisTitle}
        fullFeedbackText={fullFeedbackText}
        fullFeedbackRating={optimisticFullFeedbackRating}
        isHistoryMode={isHistoryMode}
        voiceMode={effectiveVoiceMode}
        comments={mockCommentsData}
        currentVideoTime={currentVideoTime}
        videoDuration={videoDuration}
        selectedFeedbackId={selectedFeedbackId}
        onTabChange={feedbackPanel.setActiveTab}
        // TEMP_DISABLED: Sheet expand/collapse for static layout
        // onSheetExpand={onExpand}
        // onSheetCollapse={onCollapse}
        onFeedbackItemPress={onItemPress}
        onVideoSeek={onSeek}
        onRetryFeedback={onRetryFeedback}
        onDismissError={onDismissError}
        onSelectAudio={onSelectAudio}
        onFeedbackRatingChange={handleFeedbackRatingChange}
        onFullFeedbackRatingChange={handleFullFeedbackRatingChange}
        onCommentSubmit={(text) => {
          // TODO: Handle comment submission
          console.log('Comment submitted:', text)
        }}
        onScrollYChange={onScrollYChange}
        onScrollEndDrag={onScrollEndDrag}
        scrollYShared={scrollYShared}
        scrollEnabled={scrollEnabled}
        scrollEnabledShared={scrollEnabledShared}
        scrollGestureRef={scrollGestureRef}
        onMinimizeVideo={onMinimizeVideo}
      />
    </YStack>
  )
})

FeedbackSection.displayName = 'FeedbackSection'

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(FeedbackSection as any).whyDidYouRender = true
}
