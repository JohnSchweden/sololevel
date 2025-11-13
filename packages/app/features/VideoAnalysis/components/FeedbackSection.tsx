//import { log } from '@my/logging'
import { memo, useEffect, useMemo, useRef } from 'react'

import { YStack } from 'tamagui'

import { FeedbackPanel } from '@ui/components/VideoAnalysis'

import { mockComments } from '@app/mocks/comments'

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
  onScrollYChange?: (scrollY: number) => void
  onScrollEndDrag?: () => void
  scrollEnabled?: boolean
  rootPanRef?: React.RefObject<any>
}

export const FeedbackSection = memo(function FeedbackSection({
  feedbackItems,
  analysisTitle,
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
  onScrollYChange,
  onScrollEndDrag,
  scrollEnabled,
  rootPanRef,
}: FeedbackSectionProps) {
  // PERFORMANCE FIX: Direct subscription to highlighted feedback state
  // Eliminates VideoAnalysisScreen re-renders when feedback selection changes
  const selectedFeedbackId = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.highlightedFeedbackId : null
  )

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

  useEffect(() => {
    // log.debug('FeedbackSection', 'selectedFeedbackId prop changed', {
    //   selectedFeedbackId,
    //   panelFraction: feedbackPanel.panelFraction,
    //   isExpanded: feedbackPanel.panelFraction > 0.1,
    // })
  }, [selectedFeedbackId, feedbackPanel.panelFraction])

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
        feedbackItems={preparedItems}
        analysisTitle={analysisTitle}
        comments={mockComments}
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
        onCommentSubmit={(text) => {
          // TODO: Handle comment submission
          console.log('Comment submitted:', text)
        }}
        onScrollYChange={onScrollYChange}
        onScrollEndDrag={onScrollEndDrag}
        scrollEnabled={scrollEnabled}
        rootPanRef={rootPanRef}
      />
    </YStack>
  )
})

FeedbackSection.displayName = 'FeedbackSection'

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(FeedbackSection as any).whyDidYouRender = true
}
