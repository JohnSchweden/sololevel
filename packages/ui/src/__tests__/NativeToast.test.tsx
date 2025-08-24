import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import { config } from '@my/config'
import { NativeToast } from '../NativeToast'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tamagui toast hook
const mockUseToastState = vi.hoisted(() => vi.fn())

vi.mock('@tamagui/toast', () => {
  const FakeToast: any = ({ children, ...props }: any) => {
    // Strip non-DOM props to avoid React warnings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { viewportName, enterStyle, exitStyle, y, opacity, scale, animation, ...rest } = props
    return (
      <div
        data-testid="toast"
        data-viewport-name={viewportName}
        {...rest}
      >
        {children}
      </div>
    )
  }
  FakeToast.Title = ({ children }: any) => <span data-testid="toast-title">{children}</span>
  FakeToast.Description = ({ children }: any) => (
    <span data-testid="toast-description">{children}</span>
  )

  return {
    Toast: FakeToast,
    useToastState: mockUseToastState,
  }
})

function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('NativeToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no toast state', () => {
    mockUseToastState.mockReturnValue(null)

    renderWithProvider(<NativeToast />)

    expect(screen.queryByTestId('toast')).toBeNull()
  })

  it('renders nothing when toast is handled natively', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-1',
      title: 'Test Toast',
      isHandledNatively: true,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.queryByTestId('toast')).toBeNull()
  })

  it('renders toast with title only', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-1',
      title: 'Test Toast Title',
      message: null,
      duration: 3000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Test Toast Title')).toBeTruthy()
  })

  it('renders toast with title and message', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-2',
      title: 'Success',
      message: 'Operation completed successfully',
      duration: 5000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Success')).toBeTruthy()
    expect(screen.getByText('Operation completed successfully')).toBeTruthy()
  })

  it('renders toast without message when message is empty', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-3',
      title: 'Info',
      message: '',
      duration: 2000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Info')).toBeTruthy()
    // Description should not be rendered when message is empty
    expect(screen.queryByTestId('toast-description')).toBeNull()
  })

  it('applies correct toast properties', () => {
    const mockToast = {
      id: 'toast-4',
      title: 'Test',
      message: 'Test message',
      duration: 4000,
      viewportName: 'custom-viewport',
      isHandledNatively: false,
    }

    mockUseToastState.mockReturnValue(mockToast)

    renderWithProvider(<NativeToast />)

    const toast = screen.getByTestId('toast')
    expect(toast).toBeTruthy()
    expect(toast).toHaveAttribute('duration', '4000')
    expect(toast).toHaveAttribute('data-viewport-name', 'custom-viewport')
  })
})
