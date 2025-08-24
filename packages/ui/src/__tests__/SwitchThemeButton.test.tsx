import { render, screen, fireEvent } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import { config } from '@my/config'
import { SwitchThemeButton } from '../SwitchThemeButton'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tamagui theme hooks
const mockUseThemeSetting = vi.hoisted(() => vi.fn())
const mockUseRootTheme = vi.hoisted(() => vi.fn())

vi.mock('@tamagui/next-theme', () => ({
  useThemeSetting: mockUseThemeSetting,
  useRootTheme: mockUseRootTheme,
}))

function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('SwitchThemeButton', () => {
  const mockToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    mockUseThemeSetting.mockReturnValue({
      current: 'light',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'light',
    })

    mockUseRootTheme.mockReturnValue(['light'])
  })

  it('renders with light theme', () => {
    renderWithProvider(<SwitchThemeButton />)

    const btnLight = screen.getByRole('button', { name: /Change theme:\s*light/i })
    expect(btnLight).toBeTruthy()
  })

  it('renders with dark theme', () => {
    mockUseThemeSetting.mockReturnValue({
      current: 'dark',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'dark',
    })

    mockUseRootTheme.mockReturnValue(['dark'])

    renderWithProvider(<SwitchThemeButton />)

    const btnDark = screen.getByRole('button', { name: /Change theme:\s*dark/i })
    expect(btnDark).toBeTruthy()
  })

  it('calls toggle function when clicked', () => {
    renderWithProvider(<SwitchThemeButton />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('handles forced theme correctly', () => {
    mockUseThemeSetting.mockReturnValue({
      current: 'light',
      toggle: mockToggle,
      forcedTheme: 'dark',
      resolvedTheme: 'dark',
    })

    renderWithProvider(<SwitchThemeButton />)

    // Should show the forced theme
    const btnForced = screen.getByRole('button', { name: /Change theme:\s*dark/i })
    expect(btnForced).toBeTruthy()
  })

  it('updates theme display when theme changes', () => {
    // Initial render with light theme
    const { rerender } = renderWithProvider(<SwitchThemeButton />)
    expect(screen.getByRole('button', { name: /Change theme:\s*light/i })).toBeTruthy()

    // Update mock to return dark theme
    mockUseThemeSetting.mockReturnValue({
      current: 'dark',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'dark',
    })

    // Re-render component
    rerender(
      <TamaguiProvider config={config}>
        <SwitchThemeButton />
      </TamaguiProvider>
    )

    expect(screen.getByRole('button', { name: /Change theme:\s*dark/i })).toBeTruthy()
  })
})
