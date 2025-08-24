import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import { config } from '@my/config'
import { CustomToast } from '../CustomToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Platform to control web/native behavior
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web' as 'web' | 'ios' | 'android',
  },
}))

// Mock NativeToast component
vi.mock('../NativeToast', () => ({
  NativeToast: () => <div data-testid="native-toast">Native Toast</div>,
}))

function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('CustomToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders NativeToast on web platform', async () => {
    // Ensure Platform.OS is 'web'
    const { Platform } = await import('react-native')
    Platform.OS = 'web'

    renderWithProvider(<CustomToast />)

    // Should render the NativeToast component
    expect(screen.getByTestId('native-toast')).toBeTruthy()
    expect(screen.getByText('Native Toast')).toBeTruthy()
  })

  it('renders nothing on Expo/native platforms', async () => {
    // Set Platform.OS to a native platform
    const { Platform } = await import('react-native')
    Platform.OS = 'ios'

    // Re-import the component after changing Platform.OS
    const { CustomToast: FreshCustomToast } = await import('../CustomToast')

    const { container } = renderWithProvider(<FreshCustomToast />)

    // Should render nothing - check for empty or minimal content
    const hasContent = container.textContent && container.textContent.trim().length > 0
    expect(hasContent).toBeFalsy()
  })

  it('renders nothing on Android platform', async () => {
    const { Platform } = await import('react-native')
    Platform.OS = 'android'

    // Re-import the component after changing Platform.OS
    const { CustomToast: FreshCustomToast } = await import('../CustomToast')

    const { container } = renderWithProvider(<FreshCustomToast />)

    // Should render nothing - check for empty or minimal content
    const hasContent = container.textContent && container.textContent.trim().length > 0
    expect(hasContent).toBeFalsy()
  })
})
