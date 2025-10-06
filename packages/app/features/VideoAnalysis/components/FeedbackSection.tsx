import { memo, useMemo } from 'react'

import { YStack } from 'tamagui'

import { SocialIcons } from '@ui/components/VideoAnalysis'
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
  onShare?: () => void
  onLike?: () => void
  onComment?: () => void
  onBookmark?: () => void
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
  onShare,
  onLike,
  onComment,
  onBookmark,
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
    <YStack flex={panelFraction}>
      <SocialIcons
        likes={1200}
        comments={89}
        bookmarks={234}
        shares={1500}
        onShare={onShare ?? (() => {})}
        onLike={onLike ?? (() => {})}
        onComment={onComment ?? (() => {})}
        onBookmark={onBookmark ?? (() => {})}
        isVisible={panelFraction > 0.1}
      />

      <FeedbackPanel
        flex={panelFraction}
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
