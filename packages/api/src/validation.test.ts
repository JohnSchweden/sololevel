import { describe, expect, it } from 'vitest'
import { ProfileSchema, validateApiResponse } from './validation'

describe('ProfileSchema', () => {
  describe('avatar_url validation', () => {
    it('should accept null avatar_url', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.avatar_url).toBeNull()
      }
    })

    it('should accept valid URL string', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.avatar_url).toBe('https://example.com/avatar.jpg')
      }
    })

    it('should reject invalid URL string', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: 'not-a-valid-url',
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(false)
    })
  })

  describe('datetime validation', () => {
    it('should accept ISO 8601 datetime format', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(true)
    })

    it('should accept PostgreSQL timestamp format', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: '2026-01-11 18:24:20.034935+00',
        updated_at: '2026-01-11 18:24:20.034935+00',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.created_at).toBe('2026-01-11 18:24:20.034935+00')
        expect(result.data.updated_at).toBe('2026-01-11 18:24:20.034935+00')
      }
    })

    it('should reject invalid datetime format', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: 'not-a-date',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = ProfileSchema.safeParse(profile)
      expect(result.success).toBe(false)
    })
  })

  describe('validateApiResponse', () => {
    it('should validate and return profile with null avatar_url', () => {
      const profile = {
        id: 1,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: '2026-01-11 18:24:20.034935+00',
        updated_at: '2026-01-11 18:24:20.034935+00',
      }

      const result = validateApiResponse(ProfileSchema, profile, 'test')
      expect(result.avatar_url).toBeNull()
      expect(result.created_at).toBe('2026-01-11 18:24:20.034935+00')
    })

    it('should throw error for invalid profile data', () => {
      const invalidProfile = {
        id: 1,
        user_id: 'invalid-uuid',
        full_name: 'Test User',
        username: 'testuser',
        avatar_url: null,
        bio: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      expect(() => {
        validateApiResponse(ProfileSchema, invalidProfile, 'test')
      }).toThrow()
    })
  })
})
