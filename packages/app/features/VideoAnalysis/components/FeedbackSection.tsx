import { memo, useMemo } from 'react'

import { YStack } from 'tamagui'

import { FeedbackPanel } from '@ui/components/VideoAnalysis'

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
  onExpand,
  onCollapse,
  onItemPress,
  onSeek,
  onRetryFeedback,
  onDismissError,
  onSelectAudio,
}: FeedbackSectionProps) {
  const preparedItems = useMemo(
    () =>
      feedbackItems.map((item) => ({
        ...item,
        audioUrl: audioUrls[item.id],
        audioError: errors[item.id],
      })),
    [audioUrls, errors, feedbackItems]
  )

  return (
    <YStack
      flex={panelFraction}
      position="relative"
    >
      <FeedbackPanel
        flex={1}
        isExpanded={panelFraction > 0.1}
        activeTab={activeTab}
        feedbackItems={preparedItems}
        currentVideoTime={currentVideoTime}
        videoDuration={videoDuration}
        selectedFeedbackId={selectedFeedbackId}
        onTabChange={onTabChange}
        onSheetExpand={onExpand}
        onSheetCollapse={onCollapse}
        onFeedbackItemPress={onItemPress}
        onVideoSeek={onSeek}
        onRetryFeedback={onRetryFeedback}
        onDismissError={onDismissError}
        onSelectAudio={onSelectAudio}
      />
    </YStack>
  )
})

FeedbackSection.displayName = 'FeedbackSection'
