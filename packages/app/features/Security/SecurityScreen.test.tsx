import { render, screen } from '@testing-library/react'
import { SecurityScreen } from './SecurityScreen'

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  AuthenticationSection: () => (
    <div data-testid="authentication-section">Authentication Section</div>
  ),
  SessionManagementSection: () => (
    <div data-testid="session-management-section">Session Management Section</div>
  ),
}))

// Mock tamagui components used in SecurityScreen
jest.mock('tamagui', () => ({
  YStack: ({ children, testID, ...props }: any) => (
    <div
      data-testid={testID}
      {...props}
    >
      {children}
    </div>
  ),
}))

// Mock navigation hooks
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
}

const mockNavigation = {
  setOptions: jest.fn(),
}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
}))

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 60,
}))

describe('SecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Integration', () => {
    it('should render screen with test ID', () => {
      render(<SecurityScreen testID="security-screen" />)

      expect(screen.getByTestId('security-screen')).toBeInTheDocument()
    })

    it('should render GlassBackground container', () => {
      render(<SecurityScreen testID="security-screen" />)

      expect(screen.getByTestId('security-screen')).toBeInTheDocument()
    })
  })

  describe('Section Components', () => {
    it('should render AuthenticationSection', () => {
      render(<SecurityScreen />)

      expect(screen.getByTestId('authentication-section')).toBeInTheDocument()
    })

    it('should render SessionManagementSection', () => {
      render(<SecurityScreen />)

      expect(screen.getByTestId('session-management-section')).toBeInTheDocument()
    })
  })
})
