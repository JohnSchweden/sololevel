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

const EMPTY_AUDIO_RECORD: Record<string, string> = {}

interface FeedbackSectionProps {
  feedbackItems: FeedbackPanelItem[]
  analysisTitle?: string // AI-generated analysis title
  fullFeedbackText?: string | null // Full AI feedback text for insights "Detailed Summary" section
  fullFeedbackRating?: 'up' | 'down' | null // User rating for the full feedback text
  isHistoryMode?: boolean
  voiceMode?: CoachMode // Voice mode for UI text (roast/zen/lovebomb)
  // selectedFeedbackId: string | null - REMOVED: Subscribed directly from store
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
  // PERFORMANCE FIX: Direct subscription to feedback panel state
  // Eliminates VideoAnalysisScreen re-renders when panel state changes
  const feedbackPanel = useFeedbackPanel()
  const setActiveTab = feedbackPanel.setActiveTab
  const isFeedbackTabActive = feedbackPanel.activeTab === 'feedback'

  // PERFORMANCE FIX: Direct subscription to highlighted feedback state
  // Eliminates VideoAnalysisScreen re-renders when feedback selection changes
  // PERF FIX: Gate selector to return stable value when not on feedback tab to prevent re-renders
  const selectedFeedbackId = useFeedbackCoordinatorStore((state) => {
    const rawId = process.env.NODE_ENV !== 'test' ? state.highlightedFeedbackId : null
    // Gate: return null (stable) when not on feedback tab to prevent re-renders
    const id = isFeedbackTabActive ? rawId : null
    return id
  })

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

  const prevActiveTabRef = useRef<typeof feedbackPanel.activeTab>(feedbackPanel.activeTab)
  useEffect(() => {
    const prev = prevActiveTabRef.current
    const next = feedbackPanel.activeTab
    if (prev !== next) {
      prevActiveTabRef.current = next
    }
  }, [feedbackPanel.activeTab])

  // Optimistic state for individual feedback ratings (keyed by feedbackId)
  const [optimisticFeedbackRatings, setOptimisticFeedbackRatings] = useState<
    Record<string, 'up' | 'down' | null>
  >({})

  // Subscribe only to command value (not the object with clear function)
  // This prevents infinite loops from object reference changes
  // PERF FIX: Gate selector - command bus only matters when on feedback tab
  const command = useFeedbackPanelCommandStore((state) => {
    const c = state.command
    // Gate: return null (stable) when not on feedback tab to prevent re-renders
    // Command bus is only used for tab switching, so we can ignore it when not on feedback tab
    const gatedCommand = isFeedbackTabActive ? c : null
    return gatedCommand
  })
  const processedTokenRef = useRef<number | null>(null)
  const handleTabChange = useCallback(
    (tab: typeof feedbackPanel.activeTab) => {
      setActiveTab(tab)
    },
    [feedbackPanel.activeTab, setActiveTab]
  )

  // PERFORMANCE FIX: Direct subscription to feedback audio state
  // Eliminates VideoAnalysisScreen re-renders when audio URLs/errors change
  // PERF FIX: Use separate selectors to avoid unstable combined snapshots
  // PERF FIX: Gate selectors to return stable empty objects when not on feedback tab
  const errors = useFeedbackAudioStore((state) => {
    if (!isFeedbackTabActive) {
      return EMPTY_AUDIO_RECORD
    }
    const e = process.env.NODE_ENV !== 'test' ? state.errors : {}
    return e
  })

  const audioUrls = useFeedbackAudioStore((state) => {
    if (!isFeedbackTabActive) {
      return EMPTY_AUDIO_RECORD
    }
    const u = process.env.NODE_ENV !== 'test' ? state.audioUrls : {}
    return u
  })

  // Get voice mode for comments (fallback to prop, then store, then 'roast')
  const voiceModeFromStore = useVoicePreferencesStore((s) => s.mode)
  const effectiveVoiceMode = voiceMode || voiceModeFromStore || 'roast'

  // Generate mock comments based on voice mode
  const mockCommentsData = useMemo(() => getMockComments(effectiveVoiceMode), [effectiveVoiceMode])

  // PERF FIX: Gate preparedItems - return stable empty array when not on feedback tab
  // This prevents re-renders when audioUrls/errors update but feedback tab isn't visible
  const preparedItems = useMemo(() => {
    if (!isFeedbackTabActive) {
      // Return stable empty array when not on feedback tab
      return []
    }
    return feedbackItems.map((item) => ({
      ...item,
      audioUrl: audioUrls[item.id],
      audioError: errors[item.id],
    }))
  }, [audioUrls, errors, feedbackItems, isFeedbackTabActive])

  // Process command bus requests - use token to avoid reprocessing same command
  // PERF FIX: Only process commands when on feedback tab (command bus is for tab switching)
  useEffect(() => {
    if (!command) {
      processedTokenRef.current = null
      return
    }

    if (!isFeedbackTabActive) {
      return
    }

    if (processedTokenRef.current === command.token) {
      return
    }

    processedTokenRef.current = command.token
    setActiveTab(command.tab)
    getFeedbackPanelCommandState().clear()
  }, [command, setActiveTab, isFeedbackTabActive])

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
  // PERF FIX: Gate - return stable empty array when not on feedback tab
  const feedbackItemsWithRatings = useMemo(() => {
    if (!isFeedbackTabActive) {
      // Return stable empty array when not on feedback tab
      return []
    }
    return preparedItems.map((item) => ({
      ...item,
      // FIX: Use 'in' operator to check if key exists, not ?? which treats null as falsy
      // This allows null (clearing rating) to override the DB value
      userRating:
        item.id in optimisticFeedbackRatings
          ? optimisticFeedbackRatings[item.id]
          : (item.userRating ?? null),
    }))
  }, [preparedItems, optimisticFeedbackRatings, isFeedbackTabActive])

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
        selectedFeedbackId={selectedFeedbackId}
        onTabChange={handleTabChange}
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
