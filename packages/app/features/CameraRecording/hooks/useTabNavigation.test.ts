import { renderHook } from '@testing-library/react'
import { useRouter } from 'expo-router'
import { useTabNavigation } from './useTabNavigation'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/(tabs)/record'),
}))

// Mock logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
} as any

describe('useTabNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue(mockRouter)
  })

  it('returns stable object reference when dependencies have not changed', () => {
    const mockProps = {
      pathname: '/(tabs)/record',
      router: mockRouter,
      activeTab: 'record' as const,
      setActiveTab: jest.fn(),
      isLoading: false,
    }

    const { result, rerender } = renderHook(() => useTabNavigation(mockProps))

    // Get initial reference
    const firstRender = result.current

    // Rerender without changing dependencies
    rerender()

    // Object reference should be stable (memoized)
    expect(result.current).toBe(firstRender)
    expect(result.current.currentTab).toBe(firstRender.currentTab)
    expect(result.current.shouldRender).toBe(firstRender.shouldRender)
    expect(result.current.markUserInitiatedChange).toBe(firstRender.markUserInitiatedChange)
  })

  it('returns new object reference when dependencies change', () => {
    const mockSetActiveTab = jest.fn()
    type TabType = 'coach' | 'record' | 'insights'

    const initialProps = {
      pathname: '/(tabs)/record',
      router: mockRouter,
      activeTab: 'record' as TabType,
      setActiveTab: mockSetActiveTab,
      isLoading: false,
    }

    const { result, rerender } = renderHook(({ props }) => useTabNavigation(props), {
      initialProps: { props: initialProps },
    })

    // Get initial reference
    const firstRender = result.current

    // Change pathname and activeTab to trigger currentTab change
    rerender({
      props: {
        ...initialProps,
        pathname: '/(tabs)/coach',
        activeTab: 'coach' as TabType,
      },
    })

    // Object reference should change when dependencies change
    expect(result.current).not.toBe(firstRender)
    expect(result.current.currentTab).toBe('coach')
  })
})
