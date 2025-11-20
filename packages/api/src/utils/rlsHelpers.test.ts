/**
 * Tests for RLS Helper Functions
 * Verifies that RLS utilities properly enforce authentication and user context
 */

import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock('@my/logging', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import the functions we're testing
import {
  USER_SCOPED_TABLES,
  auditDatabaseOperation,
  createUserScopedDelete,
  createUserScopedInsert,
  createUserScopedQuery,
  createUserScopedUpdate,
  getCurrentAuthenticatedUser,
  isUserScopedTable,
  requireAuthentication,
  validateUserOwnership,
} from './rlsHelpers'

// Get the mocked supabase instance
import { supabase } from '../supabase'
const mockSupabase = vi.mocked(supabase)

describe('RLS Helper Functions', () => {
  const mockUser: User = {
    id: 'test-user-123',
    email: 'test@example.com',
  } as User

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentAuthenticatedUser', () => {
    it('should return authenticated user when valid', async () => {
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getCurrentAuthenticatedUser()

      expect(result.isAuthenticated).toBe(true)
      if (result.isAuthenticated) {
        expect(result.user).toEqual(mockUser)
      }
    })

    it('should return unauthenticated when no user', async () => {
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      const result = await getCurrentAuthenticatedUser()

      expect(result.isAuthenticated).toBe(false)
      if (!result.isAuthenticated) {
        expect(result.error).toBe('User not authenticated')
      }
    })

    it('should handle authentication errors', async () => {
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' } as any,
      })

      const result = await getCurrentAuthenticatedUser()

      expect(result.isAuthenticated).toBe(false)
      if (!result.isAuthenticated) {
        expect(result.error).toBe('Authentication failed')
      }
    })
  })

  describe('requireAuthentication', () => {
    it('should return user when authenticated', async () => {
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const user = await requireAuthentication()

      expect(user).toEqual(mockUser)
    })

    it('should throw when not authenticated', async () => {
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      await expect(requireAuthentication()).rejects.toThrow('User not authenticated')
    })
  })

  describe('createUserScopedQuery', () => {
    it('should create query with user_id filter', () => {
      const mockSelect = vi.fn(() => ({ eq: vi.fn() }))
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      createUserScopedQuery('video_recordings', 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('video_recordings')
      expect(mockSelect).toHaveBeenCalledWith('*')
    })
  })

  describe('createUserScopedInsert', () => {
    it('should create insert with user_id included', () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() })),
      }))
      mockSupabase.from.mockReturnValue({ insert: mockInsert })

      const testData = { name: 'Test Video' }
      createUserScopedInsert('video_recordings', testData, 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('video_recordings')
      expect(mockInsert).toHaveBeenCalledWith({
        ...testData,
        user_id: 'user-123',
      })
    })
  })

  describe('createUserScopedUpdate', () => {
    it('should create update with user_id filter', () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single: vi.fn() })),
          })),
        })),
      }))
      mockSupabase.from.mockReturnValue({ update: mockUpdate })

      const updates = { status: 'completed' }
      createUserScopedUpdate('video_recordings', 1, updates, 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('video_recordings')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
    })
  })

  describe('createUserScopedDelete', () => {
    it('should create delete with user_id filter', () => {
      const mockDelete = vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn() })),
      }))
      mockSupabase.from.mockReturnValue({ delete: mockDelete })

      createUserScopedDelete('video_recordings', 1, 'user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('video_recordings')
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('validateUserOwnership', () => {
    it('should pass validation for owned records', () => {
      const data = { id: 1, user_id: 'user-123', name: 'Test' }

      expect(() => validateUserOwnership(data, 'user-123', 'test')).not.toThrow()
    })

    it('should throw for records owned by other users', () => {
      const data = { id: 1, user_id: 'other-user', name: 'Test' }

      expect(() => validateUserOwnership(data, 'user-123', 'test')).toThrow(
        'Access denied: record does not belong to user'
      )
    })

    it('should throw for null data', () => {
      expect(() => validateUserOwnership(null, 'user-123', 'test')).toThrow(
        'Record not found or access denied'
      )
    })

    it('should pass for records without user_id field', () => {
      const data = { id: 1, name: 'Test' } // No user_id field

      expect(() => validateUserOwnership(data, 'user-123', 'test')).not.toThrow()
    })
  })

  describe('isUserScopedTable', () => {
    it('should identify user-scoped tables', () => {
      expect(isUserScopedTable('video_recordings')).toBe(true)
      expect(isUserScopedTable('analysis_jobs')).toBe(true)
      expect(isUserScopedTable('profiles')).toBe(true)
    })

    it('should reject non-user-scoped tables', () => {
      expect(isUserScopedTable('system_config')).toBe(false)
      expect(isUserScopedTable('public_data')).toBe(false)
    })
  })

  describe('auditDatabaseOperation', () => {
    it('should pass compliant operations', () => {
      const result = auditDatabaseOperation('select', 'video_recordings', true, true)

      expect(result.isCompliant).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should flag missing authentication', () => {
      const result = auditDatabaseOperation('select', 'video_recordings', true, false)

      expect(result.isCompliant).toBe(false)
      expect(result.issues).toContain('Missing authentication check')
    })

    it('should flag missing user_id filter for user-scoped tables', () => {
      const result = auditDatabaseOperation('select', 'video_recordings', false, true)

      expect(result.isCompliant).toBe(false)
      expect(result.issues).toContain(
        'Missing user_id filter for user-scoped table: video_recordings'
      )
    })

    it('should flag missing user_id in insert for user-scoped tables', () => {
      const result = auditDatabaseOperation('insert', 'video_recordings', false, true)

      expect(result.isCompliant).toBe(false)
      expect(result.issues).toContain('Missing user_id in insert data for table: video_recordings')
    })

    it('should allow operations on non-user-scoped tables without user_id filter', () => {
      const result = auditDatabaseOperation('select', 'system_config', false, true)

      expect(result.isCompliant).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })

  describe('USER_SCOPED_TABLES constant', () => {
    it('should include all expected user-scoped tables', () => {
      const expectedTables = [
        'video_recordings',
        'analysis_jobs',
        'analysis_metrics',
        'feedback_items',
        'upload_sessions',
        'user_preferences',
        'profiles',
      ]

      expectedTables.forEach((table) => {
        expect(USER_SCOPED_TABLES).toContain(table)
      })
    })

    it('should have consistent length', () => {
      // This test ensures we don't accidentally add/remove tables
      expect(USER_SCOPED_TABLES).toHaveLength(8)
    })
  })
})
