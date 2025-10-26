import { log } from '@my/logging'
import { memo, useEffect, useMemo } from 'react'

import { YStack } from 'tamagui'

import { FeedbackPanel } from '@ui/components/VideoAnalysis'

import { useVideoAnalysisContext } from '../contexts/VideoAnalysisContext'
import type { FeedbackPanelItem } from '../types'

interface FeedbackSectionProps {
  panelFraction: number
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackPanelItem[]
  selectedFeedbackId: string | null
  currentVideoTime: number
  videoDuration: number
  errors: Record<string, string>
  audioUrls: Record<string, string>
  onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
  onExpand: () => void
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
  panelFraction,
  activeTab,
  feedbackItems,
  selectedFeedbackId,
  currentVideoTime,
  videoDuration,
  errors,
  audioUrls,
  onTabChange,
  // TEMP_DISABLED: Sheet expand/collapse for static layout
  // onExpand,
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
  const { isPullingToReveal } = useVideoAnalysisContext()
  const preparedItems = useMemo(
    () =>
      feedbackItems.map((item) => ({
        ...item,
        audioUrl: audioUrls[item.id],
        audioError: errors[item.id],
      })),
    [audioUrls, errors, feedbackItems]
  )

  useEffect(() => {
    log.debug('FeedbackSection', 'selectedFeedbackId prop changed', {
      selectedFeedbackId,
      panelFraction,
      isExpanded: panelFraction > 0.1,
    })
  }, [selectedFeedbackId, panelFraction])

  return (
    <YStack
      height="100%"
      width="100%"
      position="relative"
      // Disable interactions while header pan is in pull-to-reveal to avoid gesture conflicts
      pointerEvents={isPullingToReveal ? 'none' : 'auto'}
    >
      <FeedbackPanel
        flex={1}
        isExpanded={true}
        activeTab={activeTab}
        feedbackItems={preparedItems}
        currentVideoTime={currentVideoTime}
        videoDuration={videoDuration}
        selectedFeedbackId={selectedFeedbackId}
        onTabChange={onTabChange}
        // TEMP_DISABLED: Sheet expand/collapse for static layout
        // onSheetExpand={onExpand}
        // onSheetCollapse={onCollapse}
        onFeedbackItemPress={onItemPress}
        onVideoSeek={onSeek}
        onRetryFeedback={onRetryFeedback}
        onDismissError={onDismissError}
        onSelectAudio={onSelectAudio}
        onScrollYChange={onScrollYChange}
        onScrollEndDrag={onScrollEndDrag}
        scrollEnabled={scrollEnabled}
        rootPanRef={rootPanRef}
      />
    </YStack>
  )
})

FeedbackSection.displayName = 'FeedbackSection'
