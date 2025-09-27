import type { AuthError, Session, User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock logger
vi.mock('@my/logging', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock supabase client
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

// Import after mocks
const { authClient } = await import('../authClient')
const { supabase } = await import('../../supabase')

describe('authClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signInWithPassword', () => {
    it('signs in successfully and returns session', async () => {
      const mockSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'user-123', email: 'test@example.com' } as User,
      }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      })

      const result = await authClient.signInWithPassword('test@example.com', 'password123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.session).toEqual(mockSession)
        expect(result.data.user).toEqual(mockSession.user)
      }
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('handles authentication error', async () => {
      const mockError: AuthError = {
        name: 'AuthError',
        message: 'Invalid login credentials',
      } as AuthError

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError,
      })

      const result = await authClient.signInWithPassword('test@example.com', 'wrong-password')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('invalid_credentials')
        expect(result.error.message).toBe(
          'The email or password you entered is incorrect. Please try again.'
        )
      }
    })
  })

  describe('getCurrentUserId', () => {
    it('returns user ID from active session', async () => {
      const mockSession: Session = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'user-123', email: 'test@example.com' } as User,
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const userId = await authClient.getCurrentUserId()

      expect(userId).toBe('user-123')
    })

    it('returns null when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const userId = await authClient.getCurrentUserId()

      expect(userId).toBeNull()
    })
  })
})
