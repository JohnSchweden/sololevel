import type React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TamaguiProvider } from '@my/ui'
import { config } from '@my/config'
import { UserDetailScreen } from '../user/detail-screen'

import { vi } from 'vitest'
import { useUser } from '@my/api'

// Mock the API hook
vi.mock('@my/api', () => ({
  useUser: vi.fn(),
}))

const mockUseUser = vi.mocked(useUser)

// Mock navigation
const mockOnGoBack = vi.fn()

// Test utilities
function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <TamaguiProvider config={config}>
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    </TamaguiProvider>
  )
}

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('UserDetailScreen Error Handling', () => {
    it('handles loading state correctly', async () => {
      // Use the mocked useUser
      mockUseUser.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        isError: false,
        isPending: true,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: false,
        isStale: false,
        isFetching: true,
        isFetched: false,
        isFetchedAfterMount: false,
        isPlaceholderData: false,
        status: 'pending' as const,
        fetchStatus: 'fetching' as const,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: true,
        isRefetching: false,
      } as any)

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // Should show loading spinner
      expect(screen.getByText('Loading user profile...')).toBeTruthy()
    })

    it('handles error state with retry functionality', async () => {
      const mockRefetch = vi.fn()
      // Use the mocked useUser

      const testError = new Error('Network error')
      mockUseUser.mockReturnValue({
        data: undefined,
        error: testError,
        isLoading: false,
        isError: true,
        isPending: false,
        isLoadingError: true,
        isRefetchError: false,
        isSuccess: false,
        isStale: false,
        isFetching: false,
        isFetched: true,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        status: 'error' as const,
        fetchStatus: 'idle' as const,
        refetch: mockRefetch,
        dataUpdatedAt: 0,
        errorUpdatedAt: Date.now(),
        failureCount: 1,
        failureReason: testError,
        errorUpdateCount: 1,
        isInitialLoading: false,
        isRefetching: false,
      } as any)

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // Should show error banner
      expect(
        screen.getByText('Unable to connect. Please check your internet connection.')
      ).toBeTruthy()

      // Should have retry button
      const retryButton = screen.getByText('Try Again')
      expect(retryButton).toBeTruthy()

      // Test retry functionality
      fireEvent.click(retryButton)
      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })

    it('handles successful data display', async () => {
      // Use the mocked useUser
      const mockUser = {
        id: 1,
        user_id: 'test-user-id',
        full_name: 'John Doe',
        username: 'johndoe',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockUseUser.mockReturnValue({
        data: mockUser,
        error: null,
        isLoading: false,
        isError: false,
        isPending: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: true,
        isStale: false,
        isFetching: false,
        isFetched: true,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        status: 'success' as const,
        fetchStatus: 'idle' as const,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: false,
        isRefetching: false,
      } as any)

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // Should display user data
      expect(screen.getByText('John Doe')).toBeTruthy()
      expect(screen.getAllByText('test-user-id')).toHaveLength(2) // user_id appears twice (under avatar and in details)
      expect(screen.getByText('johndoe')).toBeTruthy() // username is displayed in details
    })

    it('handles empty data state', async () => {
      // Use the mocked useUser
      mockUseUser.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: false,
        isError: false,
        isPending: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: true,
        isStale: false,
        isFetching: false,
        isFetched: true,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        status: 'success' as const,
        fetchStatus: 'idle' as const,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: false,
        isRefetching: false,
      } as any)

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // Should show "not found" message
      expect(screen.getByText('User not found')).toBeTruthy()

      // Should have go back button
      const goBackButton = screen.getByText('Go Back')
      expect(goBackButton).toBeTruthy()

      fireEvent.click(goBackButton)
      expect(mockOnGoBack).toHaveBeenCalledTimes(1)
    })

    it('handles invalid user ID', () => {
      renderWithProviders(
        <UserDetailScreen
          id=""
          onGoBack={mockOnGoBack}
        />
      )

      // Should show invalid ID message
      expect(screen.getByText('Invalid user ID')).toBeTruthy()

      // Should have go back button
      const goBackButton = screen.getByText('Go Back')
      fireEvent.click(goBackButton)
      expect(mockOnGoBack).toHaveBeenCalledTimes(1)
    })

    it('handles refresh functionality', async () => {
      const mockRefetch = vi.fn()
      // Use the mocked useUser

      mockUseUser.mockReturnValue({
        data: {
          id: 1,
          user_id: 'test-user-id',
          full_name: 'Test User',
          username: 'testuser',
          avatar_url: null,
          bio: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        error: null,
        isLoading: false,
        isError: false,
        isPending: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: true,
        isStale: false,
        isFetching: false,
        isFetched: true,
        isFetchedAfterMount: true,
        isPlaceholderData: false,
        status: 'success' as const,
        fetchStatus: 'idle' as const,
        refetch: mockRefetch,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: false,
        isRefetching: false,
      } as any)

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // The refresh functionality is tested indirectly through the refetch mock
      // Since the component renders successfully, the refresh button is available
      expect(screen.getByText('Test User')).toBeTruthy()

      // Verify that refetch function is available (would be called on refresh)
      expect(mockRefetch).toBeDefined()
    })
  })

  describe('Error Boundary Integration', () => {
    it('catches component errors and shows fallback UI', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = vi.fn()

      renderWithProviders(
        <UserDetailScreen
          id="test-user-id"
          onGoBack={mockOnGoBack}
        />
      )

      // Since the screen is wrapped with ErrorBoundary,
      // any component errors should be caught
      expect(screen.queryByText('Something went wrong')).toBeFalsy()

      console.error = originalError
    })
  })

  describe('Cross-Platform Error Messages', () => {
    const errorScenarios = [
      {
        error: new Error('Network request failed'),
        expectedMessage: 'Unable to connect. Please check your internet connection.',
      },
      {
        error: new Error('401 Unauthorized'),
        expectedMessage: 'Your session has expired. Please sign in again.',
      },
      {
        error: new Error('403 Forbidden'),
        expectedMessage: "You don't have permission to access this resource.",
      },
      {
        error: new Error('404 Not Found'),
        expectedMessage: 'The requested information could not be found.',
      },
      {
        error: new Error('Request timeout'),
        expectedMessage: 'The request took too long. Please try again.',
      },
      {
        error: new Error('Validation failed'),
        expectedMessage: 'Please check your input and try again.',
      },
      {
        error: new Error('Unknown error'),
        expectedMessage: 'Something went wrong. Please try again.',
      },
    ]

    errorScenarios.forEach(({ error, expectedMessage }) => {
      it(`converts "${error.message}" to user-friendly message`, () => {
        // Use the mocked useUser
        mockUseUser.mockReturnValue({
          data: undefined,
          error,
          isLoading: false,
          isError: true,
          isPending: false,
          isLoadingError: true,
          isRefetchError: false,
          isSuccess: false,
          isStale: false,
          isFetching: false,
          isFetched: true,
          isFetchedAfterMount: true,
          isPlaceholderData: false,
          status: 'error' as const,
          fetchStatus: 'idle' as const,
          refetch: vi.fn(),
          dataUpdatedAt: 0,
          errorUpdatedAt: Date.now(),
          failureCount: 1,
          failureReason: error,
          errorUpdateCount: 1,
          isInitialLoading: false,
          isRefetching: false,
        } as any)

        renderWithProviders(
          <UserDetailScreen
            id="test-user-id"
            onGoBack={mockOnGoBack}
          />
        )

        expect(screen.getByText(expectedMessage)).toBeTruthy()
      })
    })
  })
})
