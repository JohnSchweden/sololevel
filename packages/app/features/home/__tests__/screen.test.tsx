import { vi } from "vitest"
import { render, screen } from '@testing-library/react'
import { HomeScreen } from '../screen'

// Mock the solito navigation hook
const mockUseLink = vi.fn().mockReturnValue({
  href: '/user/nate',
  onPress: vi.fn(),
})

vi.mock('solito/navigation', () => ({
  useLink: () => mockUseLink(),
}))

// Mock Platform to avoid React Native issues
vi.mock('react-native', () => ({
  Platform: { OS: 'web' }, // Use web to avoid native-specific code
}))

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome message', () => {
    render(<HomeScreen />)
    expect(screen.getByText('Welcome to Tamagui.')).toBeInTheDocument()
  })

  it('renders home screen with testID', () => {
    render(<HomeScreen />)
    expect(screen.getByTestId('home-screen')).toBeInTheDocument()
  })

  it('has link to user page', () => {
    render(<HomeScreen />)
    expect(screen.getByText('Link to user')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<HomeScreen />)
    expect(screen.getByText(/Here's a basic starter/)).toBeInTheDocument()
    expect(screen.getByText(/This screen uses the same code/)).toBeInTheDocument()
  })

  it('renders separators', () => {
    render(<HomeScreen />)
    const separators = screen.getAllByRole('separator')
    expect(separators).toHaveLength(2)
  })

  it('renders in pages mode when specified', () => {
    render(<HomeScreen pagesMode={true} />)
    expect(screen.getByText('Welcome to Tamagui.')).toBeInTheDocument()
  })

  it('renders platform-specific buttons on web', () => {
    render(<HomeScreen />)
    expect(screen.getByText('Switch Router')).toBeInTheDocument()
    expect(screen.getByText('Switch Theme')).toBeInTheDocument()
  })
})
