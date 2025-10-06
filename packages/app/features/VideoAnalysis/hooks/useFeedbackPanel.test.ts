import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useFeedbackPanel } from './useFeedbackPanel'

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('useFeedbackPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initialises collapsed with feedback tab active', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    expect(result.current.panelFraction).toBeCloseTo(0.05)
    expect(result.current.isExpanded).toBe(false)
    expect(result.current.activeTab).toBe('feedback')
    expect(result.current.selectedFeedbackId).toBeNull()
  })

  it('expands and collapses the panel', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    act(() => {
      result.current.expand()
    })

    expect(result.current.panelFraction).toBeCloseTo(0.4)
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      result.current.collapse()
    })

    expect(result.current.panelFraction).toBeCloseTo(0.05)
    expect(result.current.isExpanded).toBe(false)
  })

  it('toggles between collapsed and expanded states', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    act(() => {
      result.current.toggle()
    })
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      result.current.toggle()
    })
    expect(result.current.isExpanded).toBe(false)
  })

  it('updates the active tab', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    act(() => {
      result.current.setActiveTab('insights')
    })

    expect(result.current.activeTab).toBe('insights')
  })

  it('tracks selected feedback id', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    act(() => {
      result.current.selectFeedback('feedback-123')
    })

    expect(result.current.selectedFeedbackId).toBe('feedback-123')

    act(() => {
      result.current.selectFeedback(null)
    })

    expect(result.current.selectedFeedbackId).toBeNull()
  })
})
