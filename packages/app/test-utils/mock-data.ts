import type { Tables } from '@my/api'

// Re-export mocks from app/mocks for test compatibility
export { mockFeedbackItems, FALLBACK_VIDEO_URI } from '@app/mocks/feedback'

// Mock user data variations
export const mockUsers: Record<string, Tables<'profiles'>> = {
  complete: {
    id: 1,
    user_id: 'user-complete',
    full_name: 'John Doe',
    username: 'johndoe',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Software developer and tech enthusiast',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  minimal: {
    id: 2,
    user_id: 'user-minimal',
    full_name: 'Jane Smith',
    username: 'janesmith',
    avatar_url: null,
    bio: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  withLongBio: {
    id: 3,
    user_id: 'user-long-bio',
    full_name: 'Alice Johnson',
    username: 'alicej',
    avatar_url: 'https://example.com/alice.jpg',
    bio: 'This is a very long bio that might cause layout issues if not handled properly. It contains multiple sentences and should test text wrapping and overflow behavior in the UI components.',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
}

// Mock navigation parameters
export const mockNavParams = {
  validUserId: { id: 'test-user-id' },
  emptyUserId: { id: '' },
  numericUserId: { id: '123' },
  specialCharsUserId: { id: 'user@example.com' },
}

// Mock form data
export const mockFormData = {
  validUser: {
    full_name: 'Test User',
    username: 'testuser',
    bio: 'Test bio',
  },
  invalidUser: {
    full_name: '',
    username: 'a', // too short
    bio: 'x'.repeat(501), // too long
  },
}

// Mock API responses
export const mockApiResponses = {
  success: {
    data: mockUsers.complete,
    error: null,
  },
  error: {
    data: null,
    error: {
      message: 'Something went wrong',
      code: 'UNKNOWN_ERROR',
    },
  },
  notFound: {
    data: null,
    error: {
      message: 'User not found',
      code: 'NOT_FOUND',
    },
  },
}
