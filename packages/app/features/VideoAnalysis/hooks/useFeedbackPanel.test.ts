import { act, renderHook } from '@testing-library/react-native'
import { useFeedbackPanel } from './useFeedbackPanel'

describe('useFeedbackPanel', () => {
  it('should initialize with expanded state (static layout)', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    expect(result.current.panelFraction).toBe(0.4)
    expect(result.current.isExpanded).toBe(true)
    expect(result.current.activeTab).toBe('feedback')
  })

  // TEMP_DISABLED: Panel expand/collapse functionality removed for static layout
  // it('should expand and collapse panel', () => {
  //   const { result } = renderHook(() => useFeedbackPanel())

  //   act(() => {
  //     result.current.expand()
  //   })

  //   expect(result.current.panelFraction).toBe(0.4)
  //   expect(result.current.isExpanded).toBe(true)

  //   act(() => {
  //     result.current.collapse()
  //   })

  //   expect(result.current.panelFraction).toBe(0.05)
  //   expect(result.current.isExpanded).toBe(false)
  // })

  // TEMP_DISABLED: Panel toggle functionality removed for static layout
  // it('should toggle panel state', () => {
  //   const { result } = renderHook(() => useFeedbackPanel())

  //   // Start collapsed
  //   expect(result.current.panelFraction).toBe(0.05)

  //   act(() => {
  //     result.current.toggle()
  //   })

  //   expect(result.current.panelFraction).toBe(0.4)
  //   expect(result.current.isExpanded).toBe(true)

  //   act(() => {
  //     result.current.toggle()
  //   })

  //   expect(result.current.panelFraction).toBe(0.05)
  //   expect(result.current.isExpanded).toBe(false)
  // })

  it('should change active tab', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    expect(result.current.activeTab).toBe('feedback')

    act(() => {
      result.current.setActiveTab('insights')
    })

    expect(result.current.activeTab).toBe('insights')

    act(() => {
      result.current.setActiveTab('comments')
    })

    expect(result.current.activeTab).toBe('comments')
  })

  it('should select and clear feedback', () => {
    const { result } = renderHook(() => useFeedbackPanel())

    expect(result.current.selectedFeedbackId).toBe(null)

    act(() => {
      result.current.selectFeedback('feedback-123')
    })

    expect(result.current.selectedFeedbackId).toBe('feedback-123')

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedFeedbackId).toBe(null)
  })

  it('should sync with highlighted feedback id', () => {
    const { result } = renderHook(() =>
      useFeedbackPanel({ highlightedFeedbackId: 'highlighted-123' })
    )

    expect(result.current.selectedFeedbackId).toBe('highlighted-123')

    // Update highlighted feedback
    const { result: result2 } = renderHook(() =>
      useFeedbackPanel({ highlightedFeedbackId: 'highlighted-456' })
    )

    expect(result2.current.selectedFeedbackId).toBe('highlighted-456')
  })
})
