import { LayoutAnimation, Platform } from 'react-native'

import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

interface UseFeedbackPanelOptions {
  highlightedFeedbackId?: string | null
}

export function useFeedbackPanel(options: UseFeedbackPanelOptions = {}): FeedbackPanelState {
  // TEMP_DISABLED: Initialize with expanded state for static layout
  const [panelFraction] = useState(EXPANDED_FRACTION)
  const [activeTab, setActiveTabState] = useState<FeedbackPanelTab>('feedback')
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const { highlightedFeedbackId = null } = options

  const isExpanded = useMemo(() => panelFraction > COLLAPSED_FRACTION, [panelFraction])

  // TEMP_DISABLED: Panel sizing functions for static layout
  // const expand = useCallback(() => {
  //   log.info('useFeedbackPanel', 'expand invoked')
  //   setPanelFraction(EXPANDED_FRACTION)
  // }, [])

  // const collapse = useCallback(() => {
  //   log.info('useFeedbackPanel', 'collapse invoked')
  //   setPanelFraction(COLLAPSED_FRACTION)
  // }, [])

  // const toggle = useCallback(() => {
  //   setPanelFraction((fraction) => {
  //     const next = fraction > COLLAPSED_FRACTION ? COLLAPSED_FRACTION : EXPANDED_FRACTION
  //     log.info('useFeedbackPanel', 'toggle invoked', { previous: fraction, next })
  //     return next
  //   })
  // }, [])

  // Stub functions to maintain interface compatibility
  const expand = useCallback(() => {
    log.info('useFeedbackPanel', 'expand invoked (stub for static layout)')
  }, [])

  const collapse = useCallback(() => {
    log.info('useFeedbackPanel', 'collapse invoked (stub for static layout)')
  }, [])

  const toggle = useCallback(() => {
    log.info('useFeedbackPanel', 'toggle invoked (stub for static layout)')
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

  useEffect(() => {
    log.debug('useFeedbackPanel', 'highlightedFeedbackId prop changed', {
      highlightedFeedbackId,
      currentSelectedFeedbackId: selectedFeedbackId,
    })
    setSelectedFeedbackId((previous) => {
      if (previous === highlightedFeedbackId) {
        log.debug('useFeedbackPanel', 'selectedFeedbackId unchanged (same as highlighted)', {
          id: previous,
        })
        return previous
      }
      log.debug('useFeedbackPanel', 'selectedFeedbackId updated from highlighted', {
        previous,
        next: highlightedFeedbackId,
      })
      return highlightedFeedbackId
    })
  }, [highlightedFeedbackId])

  useEffect(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      )
    }
  }, [panelFraction])

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
