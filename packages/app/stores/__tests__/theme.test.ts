/// <reference types="jest" />
// No imports needed - jest-expo preset provides globals
import { useThemeStore } from '../theme'

// Mock window.matchMedia
const mockMatchMedia = jest.fn()

describe('ThemeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useThemeStore.setState({
      mode: 'light',
      isDark: false,
    })

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    })

    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useThemeStore.getState()

      expect(state.mode).toBe('light')
      expect(state.isDark).toBe(false)
    })
  })

  describe('setMode', () => {
    it('sets light mode', () => {
      useThemeStore.getState().setMode('light')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('light')
      expect(state.isDark).toBe(false)
    })

    it('sets dark mode', () => {
      useThemeStore.getState().setMode('dark')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.isDark).toBe(true)
    })

    it('sets system mode with light preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // Light mode
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })

      useThemeStore.getState().setMode('system')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('system')
      expect(state.isDark).toBe(false)
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })

    it('sets system mode with dark preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // Dark mode
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })

      useThemeStore.getState().setMode('system')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('system')
      expect(state.isDark).toBe(true)
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })

    it('handles system mode when window is undefined (SSR)', () => {
      // Temporarily remove window
      const originalWindow = global.window
      // @ts-expect-error
      delete global.window

      useThemeStore.getState().setMode('system')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('system')
      // isDark should remain unchanged when window is undefined
      expect(state.isDark).toBe(false)

      // Restore window
      global.window = originalWindow
    })
  })

  describe('toggleMode', () => {
    it('toggles from light to dark', () => {
      useThemeStore.setState({ mode: 'light', isDark: false })

      useThemeStore.getState().toggleMode()

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.isDark).toBe(true)
    })

    it('toggles from dark to light', () => {
      useThemeStore.setState({ mode: 'dark', isDark: true })

      useThemeStore.getState().toggleMode()

      const state = useThemeStore.getState()
      expect(state.mode).toBe('light')
      expect(state.isDark).toBe(false)
    })

    it('toggles from system to dark', () => {
      useThemeStore.setState({ mode: 'system', isDark: false })

      useThemeStore.getState().toggleMode()

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.isDark).toBe(true)
    })
  })

  describe('setIsDark', () => {
    it('sets isDark to true', () => {
      useThemeStore.getState().setIsDark(true)
      expect(useThemeStore.getState().isDark).toBe(true)
    })

    it('sets isDark to false', () => {
      useThemeStore.getState().setIsDark(false)
      expect(useThemeStore.getState().isDark).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('handles complete theme switching workflow', () => {
      // Start with light mode
      expect(useThemeStore.getState().mode).toBe('light')
      expect(useThemeStore.getState().isDark).toBe(false)

      // Switch to dark mode
      useThemeStore.getState().setMode('dark')
      expect(useThemeStore.getState().mode).toBe('dark')
      expect(useThemeStore.getState().isDark).toBe(true)

      // Toggle back to light
      useThemeStore.getState().toggleMode()
      expect(useThemeStore.getState().mode).toBe('light')
      expect(useThemeStore.getState().isDark).toBe(false)

      // Set to system mode
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })

      useThemeStore.getState().setMode('system')
      expect(useThemeStore.getState().mode).toBe('system')
      expect(useThemeStore.getState().isDark).toBe(true)
    })

    it('maintains state consistency across operations', () => {
      // Set dark mode
      useThemeStore.getState().setMode('dark')
      expect(useThemeStore.getState().isDark).toBe(true)

      // Manually override isDark (edge case)
      useThemeStore.getState().setIsDark(false)
      expect(useThemeStore.getState().isDark).toBe(false)
      expect(useThemeStore.getState().mode).toBe('dark') // Mode unchanged

      // Toggle should work from current mode
      useThemeStore.getState().toggleMode()
      expect(useThemeStore.getState().mode).toBe('light')
      expect(useThemeStore.getState().isDark).toBe(false)
    })
  })
})
