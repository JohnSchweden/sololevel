import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../validation'
import { useCreateUser, useCurrentUser, useUpdateUser, useUser } from './useUser'

// Mock dependencies
vi.mock('../supabase', () => {
  const mockGetSession = vi.fn()
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getSession: mockGetSession,
      },
    },
  }
})

vi.mock('../supabase-errors', () => ({
  safeSupabaseOperation: vi.fn(),
}))

vi.mock('../validation', () => ({
  ProfileSchema: {},
  validateApiResponse: vi.fn(),
}))

vi.mock('@my/ui', () => ({
  useToastController: () => ({
    show: vi.fn(),
  }),
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches user successfully', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const { validateApiResponse } = await import('../validation')

    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)
    const mockValidateApiResponse = vi.mocked(validateApiResponse)

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

    mockSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockUser,
      message: '',
    })

    mockValidateApiResponse.mockReturnValue(mockUser)

    const { result } = renderHook(() => useUser('test-user-id'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUser)
    expect(mockSafeSupabaseOperation).toHaveBeenCalledWith(expect.any(Function), 'useUser')
    expect(mockValidateApiResponse).toHaveBeenCalledWith({}, mockUser, 'useUser')
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
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)

    mockSafeSupabaseOperation.mockResolvedValue({
      success: false,
      data: null,
      message: 'User not found',
    })

    const { result } = renderHook(() => useUser('nonexistent-user', { retry: false }), {
      wrapper: createWrapper(),
    })

    // Wait for the query to complete - focus on the operation being called
    await waitFor(
      () => {
        return mockSafeSupabaseOperation.mock.calls.length > 0
      },
      { timeout: 5000, interval: 100 }
    )

    // Then wait for error state
    await waitFor(
      () => {
        return result.current.isError && result.current.error
      },
      { timeout: 5000, interval: 100 }
    )

    // Debug: Check final state
    // log.info('Final useUser state:', result.current.status, result.current.isError)

    expect(result.current.error).toEqual(new Error('User not found'))
    expect(mockSafeSupabaseOperation).toHaveBeenCalledWith(expect.any(Function), 'useUser')
  })
})

describe('useUpdateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates user successfully', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const { validateApiResponse } = await import('../validation')

    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)
    const mockValidateApiResponse = vi.mocked(validateApiResponse)

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

    mockSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockUpdatedUser,
      message: '',
    })

    mockValidateApiResponse.mockReturnValue(mockUpdatedUser)

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
    expect(mockSafeSupabaseOperation).toHaveBeenCalledWith(expect.any(Function), 'useUpdateUser')
  })

  it('handles update error', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)

    mockSafeSupabaseOperation.mockResolvedValue({
      success: false,
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches current user successfully', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const { validateApiResponse } = await import('../validation')

    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)
    const mockValidateApiResponse = vi.mocked(validateApiResponse)

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

    const { supabase } = await import('../supabase')
    const mockGetSession = vi.mocked(supabase.auth.getSession)
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'current-user-id' },
        },
      },
    } as any)

    mockSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockUser,
      message: '',
    })

    mockValidateApiResponse.mockReturnValue(mockUser)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUser)
    const { supabase: supabaseClient3 } = await import('../supabase')
    expect(supabaseClient3.auth.getSession).toHaveBeenCalled()
  })

  it('returns null when no session', async () => {
    const { supabase: supabaseClient } = await import('../supabase')
    const mockGetSession = vi.mocked(supabaseClient.auth.getSession)
    mockGetSession.mockResolvedValue({
      data: { session: null },
    } as any)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })

  it('returns null when session has no user', async () => {
    const { supabase: supabaseClient2 } = await import('../supabase')
    const mockGetSession = vi.mocked(supabaseClient2.auth.getSession)
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: null },
      },
    } as any)

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })
})

describe('useCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates user successfully', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const { validateApiResponse } = await import('../validation')

    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)
    const mockValidateApiResponse = vi.mocked(validateApiResponse)

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

    mockSafeSupabaseOperation.mockResolvedValue({
      success: true,
      data: mockNewUser,
      message: '',
    })

    mockValidateApiResponse.mockReturnValue(mockNewUser)

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
    expect(mockSafeSupabaseOperation).toHaveBeenCalledWith(expect.any(Function), 'useCreateUser')
  })

  it('handles create error', async () => {
    const { safeSupabaseOperation } = await import('../supabase-errors')
    const mockSafeSupabaseOperation = vi.mocked(safeSupabaseOperation)

    mockSafeSupabaseOperation.mockResolvedValue({
      success: false,
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
