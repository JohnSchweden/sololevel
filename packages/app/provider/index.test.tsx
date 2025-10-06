import { render } from '@testing-library/react'
import { enableMapSet } from 'immer'
import { Provider } from './index'

// Mock enableMapSet to verify it's called
jest.mock('immer', () => ({
  enableMapSet: jest.fn(),
}))

// Mock other dependencies
jest.mock('@my/ui', () => ({
  TamaguiProvider: ({ children }: { children: React.ReactNode }) => children,
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  config: {},
}))

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  useColorScheme: () => 'light',
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('./I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('./QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('./ToastViewport', () => ({
  ToastViewport: () => null,
}))

jest.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../stores/auth', () => ({
  useAuthStore: {
    getState: () => ({ initialize: jest.fn() }),
  },
}))

jest.mock('../stores/feature-flags', () => ({
  useFeatureFlagsStore: {
    getState: () => ({ loadFlags: jest.fn() }),
  },
}))

jest.mock('@expo/react-native-action-sheet', () => ({
  ActionSheetProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset global state
    delete (global as any).__immerMapSetEnabled
  })

  it('should initialize Immer MapSet plugin', () => {
    render(
      <Provider>
        <div>Test</div>
      </Provider>
    )

    // Verify that enableMapSet was called
    expect(enableMapSet).toHaveBeenCalledTimes(1)
  })

  it('should set development flag for MapSet plugin verification', () => {
    // Set __DEV__ to true for this test
    const originalDev = __DEV__
    ;(global as any).__DEV__ = true

    render(
      <Provider>
        <div>Test</div>
      </Provider>
    )

    // Verify the development flag is set
    expect((global as any).__immerMapSetEnabled).toBe(true)

    // Restore original __DEV__
    ;(global as any).__DEV__ = originalDev
  })

  it('should render children', () => {
    const { getByText } = render(
      <Provider>
        <div>Test Child</div>
      </Provider>
    )

    expect(getByText('Test Child')).toBeTruthy()
  })
})
