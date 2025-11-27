/**
 * Tests for I18nProvider component
 *
 * Tests user-visible behavior: locale changes affect translations
 * Following TDD and testing philosophy: focus on user behavior, not implementation
 */

import { act, render } from '@testing-library/react-native'
import { Text, View } from 'react-native'
import { i18n, initializeI18n } from '../i18n'
import { I18nProvider } from './I18nProvider'

// Mock i18n module
jest.mock('../i18n', () => ({
  i18n: {
    language: 'en',
    changeLanguage: jest.fn(() => Promise.resolve('en')),
  },
  initializeI18n: jest.fn(() => Promise.resolve()),
}))

// Mock logging
jest.mock('@my/logging', () => ({
  log: {
    error: jest.fn(),
  },
}))

// Mock I18nextProvider
jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: any }) => children,
}))

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render children immediately', () => {
    // 🧪 ARRANGE: Component with children
    const TestChild = () => (
      <View testID="test-child">
        <Text>Test Content</Text>
      </View>
    )

    // 🎬 ACT: Render provider with children
    const { getByTestId } = render(
      <I18nProvider>
        <TestChild />
      </I18nProvider>
    )

    // ✅ ASSERT: Children render immediately (i18n initialized at module load)
    expect(getByTestId('test-child')).toBeTruthy()
  })

  it('should change language when locale prop is provided', async () => {
    // 🧪 ARRANGE: Component with locale prop
    const TestChild = () => (
      <View testID="test-child">
        <Text>Test</Text>
      </View>
    )

    // 🎬 ACT: Render with locale prop
    render(
      <I18nProvider locale="fr">
        <TestChild />
      </I18nProvider>
    )

    // ✅ ASSERT: changeLanguage called with locale after timeout
    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(i18n.changeLanguage).toHaveBeenCalledWith('fr')
  })

  it('should initialize i18n when locale prop is not provided', async () => {
    // 🧪 ARRANGE: Component without locale prop
    const TestChild = () => (
      <View testID="test-child">
        <Text>Test</Text>
      </View>
    )

    // 🎬 ACT: Render without locale prop
    render(
      <I18nProvider>
        <TestChild />
      </I18nProvider>
    )

    // ✅ ASSERT: initializeI18n called after timeout
    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(initializeI18n).toHaveBeenCalled()
  })

  it('should not change language if locale matches current language', async () => {
    // 🧪 ARRANGE: i18n already has matching language
    ;(i18n as any).language = 'en'

    const TestChild = () => (
      <View testID="test-child">
        <Text>Test</Text>
      </View>
    )

    // 🎬 ACT: Render with matching locale
    render(
      <I18nProvider locale="en">
        <TestChild />
      </I18nProvider>
    )

    // ✅ ASSERT: changeLanguage not called (locale matches current)
    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(i18n.changeLanguage).not.toHaveBeenCalled()
  })
})
