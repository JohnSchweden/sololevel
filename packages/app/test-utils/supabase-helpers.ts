import { vi } from 'vitest'
import type { User } from '@my/api'

// Mock Supabase user data
export const mockUser: User = {
  id: 1,
  user_id: 'test-user-id',
  full_name: 'Test User',
  username: 'testuser',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

// Mock useUser hook states
export const mockUseUserStates = {
  loading: {
    data: undefined,
    error: null,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  },
  success: {
    data: mockUser,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  error: {
    data: undefined,
    error: new Error('Network error'),
    isLoading: false,
    isError: true,
    refetch: vi.fn(),
  },
  notFound: {
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}

// Common error scenarios for testing
export const mockErrors = {
  network: new Error('Network request failed'),
  unauthorized: new Error('401 Unauthorized'),
  forbidden: new Error('403 Forbidden'),
  notFound: new Error('404 Not Found'),
  timeout: new Error('Request timeout'),
  validation: new Error('Validation failed'),
  unknown: new Error('Unknown error'),
}

// Expected user-friendly error messages
export const expectedErrorMessages = {
  'Network request failed': 'Unable to connect. Please check your internet connection.',
  '401 Unauthorized': 'Your session has expired. Please sign in again.',
  '403 Forbidden': "You don't have permission to access this resource.",
  '404 Not Found': 'The requested information could not be found.',
  'Request timeout': 'The request took too long. Please try again.',
  'Validation failed': 'Please check your input and try again.',
  'Unknown error': 'Something went wrong. Please try again.',
}

// Helper to create mock mutation functions
export function createMockMutation(
  options: { isLoading?: boolean; isError?: boolean; error?: Error; isSuccess?: boolean } = {}
) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: options.isLoading ?? false,
    isError: options.isError ?? false,
    error: options.error ?? null,
    isSuccess: options.isSuccess ?? false,
    reset: vi.fn(),
  }
}
