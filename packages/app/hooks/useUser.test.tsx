// Unmock React Query to use real implementation (global setup mocks it)
jest.unmock('@tanstack/react-query')

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useCreateUser, useCurrentUser, useUpdateUser, useUser } from './useUser'

// Mock dependencies
jest.mock('@my/api', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
  },
  safeSupabaseOperation: jest.fn(),
  ProfileSchema: {},
  validateApiResponse: jest.fn(),
}))

jest.mock('@my/ui', () => ({
  useToastController: () => ({
    show: jest.fn(),
  }),
}))

// Import after mocks
import type { User } from '@my/api'
import { safeSupabaseOperation, supabase, validateApiResponse } from '@my/api'

// Typed mock references
const mockedSupabase = supabase as jest.Mocked<typeof supabase>
const mockedSafeSupabaseOperation = safeSupabaseOperation as jest.MockedFunction<
  typeof safeSupabaseOperation
>
const mockedValidateApiResponse = validateApiResponse as jest.MockedFunction<
  typeof validateApiResponse
>

// Polyfill window for SSR-safe hooks
const originalWindow = (globalThis as any).window

beforeAll(() => {
  if (typeof window === 'undefined') {
    ;(globalThis as any).window = {}
  }
})

afterAll(() => {
  if (originalWindow === undefined) {
    delete (globalThis as any).window
  } else {
    ;(globalThis as any).window = originalWindow
  }
})

beforeEach(() => {
  jest.clearAllMocks()
  // Set default implementation for validateApiResponse
  mockedValidateApiResponse.mockImplementation((_, value) => value as any)
})

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useUser', () => {
  it('fetches user successfully', async () => {
    const mockUser: User = {
      id: 1,
      user_id: 'test-user-id',
      full_name: 'Test User',
      username: 'testuser',
      avatar_url: null,
      bio: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    mockedSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockUser,
      message: '',
    })

    mockedValidateApiResponse.mockReturnValue(mockUser)

    const { result } = renderHook(() => useUser('test-user-id'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUser)
    expect(mockedSafeSupabaseOperation).toHaveBeenCalled()
  })

  it('handles missing user ID', async () => {
    const { result } = renderHook(() => useUser(undefined), {
      wrapper: createWrapper(),
    })

    // Query should be disabled when userId is undefined
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('handles empty user ID', async () => {
    const { result } = renderHook(() => useUser(''), {
      wrapper: createWrapper(),
    })

    // Query should be disabled when userId is empty
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('handles fetch error', async () => {
    mockedSafeSupabaseOperation.mockResolvedValue({
      success: false,
      data: null,
      message: 'User not found',
    })

    const { result } = renderHook(() => useUser('nonexistent-user', { retry: false }), {
      wrapper: createWrapper(),
    })

    // Wait for query to execute and enter error state
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 1000 })

    expect(result.current.error).toEqual(new Error('User not found'))
  })
})

describe('useUpdateUser', () => {
  it('updates user successfully', async () => {
    const mockUpdatedUser: User = {
      id: 1,
      user_id: 'test-user-id',
      full_name: 'Updated User',
      username: 'updateduser',
      avatar_url: null,
      bio: 'Updated bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    }

    mockedSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockUpdatedUser,
      message: '',
    })

    mockedValidateApiResponse.mockReturnValue(mockUpdatedUser)

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    })

    const updateData = {
      user_id: 'test-user-id',
      full_name: 'Updated User',
      bio: 'Updated bio',
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUpdatedUser)
    expect(mockedSafeSupabaseOperation).toHaveBeenCalled()
  })

  it('handles update error', async () => {
    mockedSafeSupabaseOperation.mockResolvedValue({
      success: false,
      data: null,
      message: 'Update failed',
    })

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    })

    const updateData = {
      user_id: 'test-user-id',
      full_name: 'Updated User',
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(new Error('Update failed'))
  })
})

describe('useCurrentUser', () => {
  it('fetches current user successfully', async () => {
    const mockUser: User = {
      id: 1,
      user_id: 'current-user-id',
      full_name: 'Current User',
      username: 'currentuser',
      avatar_url: null,
      bio: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    ;(mockedSupabase.auth.getSession as jest.MockedFunction<any>).mockResolvedValue({
      data: {
        session: {
          user: { id: 'current-user-id' },
        },
      },
    } as any)

    // Mock the from().select().match().single() chain
    const mockSelect = jest.fn().mockReturnThis()
    const mockMatch = jest.fn().mockReturnThis()
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockUser,
      error: null,
    })

    mockSelect.mockReturnValue({
      match: mockMatch,
    })
    mockMatch.mockReturnValue({
      single: mockSingle,
    })

    mockedSupabase.from = jest.fn().mockReturnValue({
      select: mockSelect,
    }) as any

    mockedValidateApiResponse.mockReturnValue(mockUser)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUser)
    expect(mockedSupabase.auth.getSession).toHaveBeenCalled()
    expect(mockSelect).toHaveBeenCalledWith(
      'id, user_id, username, full_name, avatar_url, bio, created_at, updated_at'
    )
  })

  it('returns null when no session', async () => {
    ;(mockedSupabase.auth.getSession as jest.MockedFunction<any>).mockResolvedValue({
      data: { session: null },
    } as any)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    // When there's no session, the query should return null immediately
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeNull()
  })

  it('returns null when session has no user', async () => {
    ;(mockedSupabase.auth.getSession as jest.MockedFunction<any>).mockResolvedValue({
      data: {
        session: { user: null },
      },
    } as any)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    // When there's no user in session, the query should return null immediately
    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeNull()
  })

  it('returns null when profile not found (PGRST116)', async () => {
    ;(mockedSupabase.auth.getSession as jest.MockedFunction<any>).mockResolvedValue({
      data: {
        session: {
          user: { id: 'current-user-id' },
        },
      },
    } as any)

    // Mock the from().select().match().single() chain
    const mockSelect = jest.fn().mockReturnThis()
    const mockMatch = jest.fn().mockReturnThis()
    const mockSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    mockSelect.mockReturnValue({
      match: mockMatch,
    })
    mockMatch.mockReturnValue({
      single: mockSingle,
    })

    mockedSupabase.from = jest.fn().mockReturnValue({
      select: mockSelect,
    }) as any

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeNull()
    expect(mockSelect).toHaveBeenCalledWith(
      'id, user_id, username, full_name, avatar_url, bio, created_at, updated_at'
    )
    expect(mockedValidateApiResponse).not.toHaveBeenCalled()
  })
})

describe('useCreateUser', () => {
  it('creates user successfully', async () => {
    const mockNewUser: User = {
      id: 1,
      user_id: 'new-user-id',
      full_name: 'New User',
      username: 'newuser',
      avatar_url: null,
      bio: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    mockedSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockNewUser,
      message: '',
    })

    mockedValidateApiResponse.mockReturnValue(mockNewUser)

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    })

    const userData = {
      user_id: 'new-user-id',
      full_name: 'New User',
      username: 'newuser',
      avatar_url: null,
      bio: null,
    }

    result.current.mutate(userData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockNewUser)
    expect(mockedSafeSupabaseOperation).toHaveBeenCalled()
  })

  it('handles create error', async () => {
    mockedSafeSupabaseOperation.mockResolvedValue({
      success: false,
      data: null,
      message: 'Create failed',
    })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    })

    const userData = {
      user_id: 'new-user-id',
      full_name: 'New User',
      username: 'newuser',
      avatar_url: null,
      bio: null,
    }

    result.current.mutate(userData)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(new Error('Create failed'))
  })
})
