import { log } from '@my/logging'
import { useCallback, useMemo, useState } from 'react'

export type FeedbackPanelTab = 'feedback' | 'insights' | 'comments'

export interface FeedbackPanelState {
  panelFraction: number
  isExpanded: boolean
  activeTab: FeedbackPanelTab
  selectedFeedbackId: string | null

  expand: () => void
  collapse: () => void
  toggle: () => void
  setActiveTab: (tab: FeedbackPanelTab) => void
  selectFeedback: (feedbackId: string | null) => void
  clearSelection: () => void
}

const COLLAPSED_FRACTION = 0.05
const EXPANDED_FRACTION = 0.4

export function useFeedbackPanel(): FeedbackPanelState {
  const [panelFraction, setPanelFraction] = useState(COLLAPSED_FRACTION)
  const [activeTab, setActiveTabState] = useState<FeedbackPanelTab>('feedback')
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)

  const isExpanded = useMemo(() => panelFraction > COLLAPSED_FRACTION, [panelFraction])

  const expand = useCallback(() => {
    log.info('useFeedbackPanel', 'expand invoked')
    setPanelFraction(EXPANDED_FRACTION)
  }, [])

  const collapse = useCallback(() => {
    log.info('useFeedbackPanel', 'collapse invoked')
    setPanelFraction(COLLAPSED_FRACTION)
  }, [])

  const toggle = useCallback(() => {
    setPanelFraction((fraction) => {
      const next = fraction > COLLAPSED_FRACTION ? COLLAPSED_FRACTION : EXPANDED_FRACTION
      log.info('useFeedbackPanel', 'toggle invoked', { previous: fraction, next })
      return next
    })
  }, [])

  const setActiveTab = useCallback((tab: FeedbackPanelTab) => {
    log.info('useFeedbackPanel', 'active tab changed', { tab })
    setActiveTabState(tab)
  }, [])

  const selectFeedback = useCallback((feedbackId: string | null) => {
    log.info('useFeedbackPanel', 'selectFeedback invoked', { feedbackId })
    setSelectedFeedbackId(feedbackId)
  }, [])

  const clearSelection = useCallback(() => {
    if (selectedFeedbackId) {
      log.info('useFeedbackPanel', 'clearSelection invoked', { feedbackId: selectedFeedbackId })
    }
    setSelectedFeedbackId(null)
  }, [selectedFeedbackId])

  return {
    panelFraction,
    isExpanded,
    activeTab,
    selectedFeedbackId,
    expand,
    collapse,
    toggle,
    setActiveTab,
    selectFeedback,
    clearSelection,
  }
}
