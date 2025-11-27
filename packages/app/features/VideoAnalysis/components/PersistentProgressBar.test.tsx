/**
 * Tests for PersistentProgressBar component
 *
 * Tests user-visible behavior: progress display and fallback rendering
 * Following TDD and testing philosophy: focus on user behavior, not implementation
 */

import { act } from '@testing-library/react'
import { render, screen } from '@testing-library/react-native'
import { usePersistentProgressStore } from '../stores'
import { PersistentProgressBar } from './PersistentProgressBar'

// Mock Reanimated
const mockSharedValue = (initial: any) => ({
  value: initial,
  get: jest.fn(() => initial),
  set: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  modify: jest.fn(),
})

jest.mock('react-native-reanimated', () => ({
  useAnimatedStyle: jest.fn(() => ({ opacity: 1 })),
  useSharedValue: mockSharedValue,
}))

// Mock ProgressBar component
jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')
  return {
    ProgressBar: ({ testID, progress, variant, ...props }: any) =>
      React.createElement('div', {
        testID,
        'data-testid': testID,
        'data-progress': progress,
        'data-variant': variant,
        ...props,
      }),
  }
})

// Mock store - use actual Zustand store for testing
jest.mock('../stores/persistentProgress', () => {
  const { create } = require('zustand')
  const store = create(() => ({
    props: null,
  }))
  return {
    usePersistentProgressStore: store,
  }
})

describe('PersistentProgressBar', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      usePersistentProgressStore.setState({ props: null })
    })
  })

  it('should render visual-only bar when props are null', () => {
    // 🧪 ARRANGE: Store has no props
    act(() => {
      usePersistentProgressStore.setState({ props: null })
    })

    // 🎬 ACT: Render component
    render(<PersistentProgressBar />)

    // ✅ ASSERT: Visual-only bar renders with correct testID
    const bar = screen.getByTestId('persistent-progress-bar-visual-only')
    expect(bar).toBeTruthy()
    expect(bar.props['data-progress']).toBe(0)
    expect(bar.props['data-variant']).toBe('persistent')
  })

  it('should render progress bar with calculated progress when props are set', () => {
    // 🧪 ARRANGE: Store has props with currentTime and duration
    const mockProps = {
      currentTime: 5.5,
      duration: 10.0,
      isScrubbing: false,
      controlsVisible: true,
      pointerEvents: 'auto' as const,
      visibility: mockSharedValue(1),
      animatedStyle: { opacity: 1 },
      shouldRenderPersistent: true,
      combinedGesture: { gestureId: 1 },
      mainGesture: { gestureId: 2 },
      onLayout: jest.fn(),
      onFallbackPress: jest.fn(),
    }

    act(() => {
      usePersistentProgressStore.setState({ props: mockProps })
    })

    // 🎬 ACT: Render component
    render(<PersistentProgressBar />)

    // ✅ ASSERT: Progress bar renders with calculated progress (55%)
    const bar = screen.getByTestId('persistent-progress-bar')
    expect(bar).toBeTruthy()
    expect(bar.props['data-progress']).toBeCloseTo(55, 5) // (5.5 / 10.0) * 100
  })

  it('should handle zero duration gracefully', () => {
    // 🧪 ARRANGE: Store has props with zero duration
    const mockProps = {
      currentTime: 5.5,
      duration: 0,
      isScrubbing: false,
      controlsVisible: true,
      pointerEvents: 'auto' as const,
      visibility: mockSharedValue(1),
      animatedStyle: { opacity: 1 },
      shouldRenderPersistent: true,
      combinedGesture: { gestureId: 1 },
      mainGesture: { gestureId: 2 },
      onLayout: jest.fn(),
      onFallbackPress: jest.fn(),
    }

    act(() => {
      usePersistentProgressStore.setState({ props: mockProps })
    })

    // 🎬 ACT: Render component
    render(<PersistentProgressBar />)

    // ✅ ASSERT: Progress bar renders with 0% progress
    const bar = screen.getByTestId('persistent-progress-bar')
    expect(bar.props['data-progress']).toBe(0)
  })
})
