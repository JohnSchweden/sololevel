/**
 * TDD Tests for Voice Preferences Service
 * Tests user preference management and analysis job snapshot storage
 */

import { log } from '@my/logging'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../supabase'
import {
  type AnalysisJobVoiceSnapshot,
  type VoicePreferences,
  getUserVoicePreferences,
  hasUserSetVoicePreferences,
  updateAnalysisJobVoiceSnapshot,
  updateVoicePreferences,
} from './voicePreferencesService'

// Mock @my/logging
vi.mock('@my/logging', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockSupabaseFrom = supabase.from as ReturnType<typeof vi.fn>

describe('voicePreferencesService', () => {
  describe('getUserVoicePreferences', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mock query chain
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)
    })

    it('should return preferences for valid user', async () => {
      // Arrange
      const userId = 'user-123'
      const mockProfile = {
        id: 1,
        user_id: userId,
        coach_gender: 'female',
        coach_mode: 'roast',
        username: 'testuser',
        created_at: '2025-01-08T00:00:00Z',
        updated_at: '2025-01-08T00:00:00Z',
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getUserVoicePreferences(userId)

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
      expect(chain.select).toHaveBeenCalledWith('coach_gender, coach_mode')
      expect(chain.eq).toHaveBeenCalledWith('user_id', userId)
      expect(chain.single).toHaveBeenCalledTimes(1)

      expect(result).toEqual({
        preferences: {
          coachGender: 'female',
          coachMode: 'roast',
        },
        hasSetPreferences: true,
      })
    })

    it('should return default values if columns null', async () => {
      // Arrange
      const userId = 'user-456'
      const mockProfile = {
        id: 2,
        user_id: userId,
        coach_gender: null,
        coach_mode: null,
        username: 'newuser',
        created_at: '2025-01-08T00:00:00Z',
        updated_at: '2025-01-08T00:00:00Z',
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getUserVoicePreferences(userId)

      // Assert
      expect(result).toEqual({
        preferences: {
          coachGender: 'female',
          coachMode: 'roast',
        },
        hasSetPreferences: false, // coach_mode was null, so defaults applied
      })
    })

    it('should return null for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent'
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getUserVoicePreferences(userId)

      // Assert
      expect(result).toBeNull()
      expect(log.info).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'No profile found for user',
        { userId }
      )
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-789'
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST301', message: 'Database connection error' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act & Assert
      await expect(getUserVoicePreferences(userId)).rejects.toThrow(
        'Failed to fetch voice preferences: Database connection error'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'Failed to fetch voice preferences',
        expect.objectContaining({
          code: 'PGRST301',
          userId,
        })
      )
    })
  })

  describe('hasUserSetVoicePreferences', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mock query chain
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)
    })

    it('should return true when coach_mode is set', async () => {
      // Arrange
      const userId = 'user-123'
      const mockProfile = {
        coach_mode: 'roast',
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await hasUserSetVoicePreferences(userId)

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
      expect(chain.select).toHaveBeenCalledWith('coach_mode')
      expect(chain.eq).toHaveBeenCalledWith('user_id', userId)
      expect(chain.single).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('should return false when coach_mode is null (first login)', async () => {
      // Arrange
      const userId = 'user-456'
      const mockProfile = {
        coach_mode: null,
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await hasUserSetVoicePreferences(userId)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for non-existent user', async () => {
      // Arrange
      const userId = 'non-existent'
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await hasUserSetVoicePreferences(userId)

      // Assert
      expect(result).toBe(false)
      expect(log.info).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'No profile found for user',
        { userId }
      )
    })

    it('should throw error on database failure', async () => {
      // Arrange
      const userId = 'user-123'
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST301', message: 'Database connection failed' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act & Assert
      await expect(hasUserSetVoicePreferences(userId)).rejects.toThrow(
        'Failed to check voice preferences: Database connection failed'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'Failed to check voice preferences',
        expect.objectContaining({
          code: 'PGRST301',
          userId,
        })
      )
    })
  })

  describe('updateVoicePreferences', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mock query chain
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)
    })

    it('should update gender only', async () => {
      // Arrange
      const userId = 'user-123'
      const preferences = { coachGender: 'male' as const }
      const mockUpdatedProfile = {
        coach_gender: 'male',
        coach_mode: 'roast',
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockUpdatedProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await updateVoicePreferences(userId, preferences)

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles')
      expect(chain.update).toHaveBeenCalledWith({ coach_gender: 'male' })
      expect(chain.eq).toHaveBeenCalledWith('user_id', userId)
      expect(chain.select).toHaveBeenCalledWith('coach_gender, coach_mode')
      expect(chain.single).toHaveBeenCalledTimes(1)

      expect(result).toEqual({
        coachGender: 'male',
        coachMode: 'roast',
      })
    })

    it('should update mode only', async () => {
      // Arrange
      const userId = 'user-456'
      const preferences = { coachMode: 'zen' as const }
      const mockUpdatedProfile = {
        coach_gender: 'female',
        coach_mode: 'zen',
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockUpdatedProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await updateVoicePreferences(userId, preferences)

      // Assert
      expect(chain.update).toHaveBeenCalledWith({ coach_mode: 'zen' })
      expect(result).toEqual({
        coachGender: 'female',
        coachMode: 'zen',
      })
    })

    it('should update both gender and mode', async () => {
      // Arrange
      const userId = 'user-789'
      const preferences: VoicePreferences = {
        coachGender: 'male',
        coachMode: 'lovebomb',
      }
      const mockUpdatedProfile = {
        coach_gender: 'male',
        coach_mode: 'lovebomb',
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockUpdatedProfile, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await updateVoicePreferences(userId, preferences)

      // Assert
      expect(chain.update).toHaveBeenCalledWith({
        coach_gender: 'male',
        coach_mode: 'lovebomb',
      })
      expect(result).toEqual({
        coachGender: 'male',
        coachMode: 'lovebomb',
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-999'
      const preferences = { coachGender: 'female' as const }
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST301', message: 'Database connection error' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act & Assert
      await expect(updateVoicePreferences(userId, preferences)).rejects.toThrow(
        'Failed to update voice preferences: Database connection error'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'Failed to update voice preferences',
        expect.objectContaining({
          code: 'PGRST301',
          userId,
        })
      )
    })
  })

  describe('updateAnalysisJobVoiceSnapshot', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mock query chain
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
      mockSupabaseFrom.mockReturnValue(chain)
    })

    it('should store all snapshot fields', async () => {
      // Arrange
      const jobId = 123
      const snapshot: AnalysisJobVoiceSnapshot = {
        coachGender: 'female',
        coachMode: 'roast',
        voiceNameUsed: 'Aoede',
        avatarAssetKeyUsed: 'female_roast',
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      await updateAnalysisJobVoiceSnapshot(jobId, snapshot)

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('analysis_jobs')
      expect(chain.update).toHaveBeenCalledWith({
        coach_gender: 'female',
        coach_mode: 'roast',
        voice_name_used: 'Aoede',
        avatar_asset_key_used: 'female_roast',
      })
      expect(chain.eq).toHaveBeenCalledWith('id', jobId)
    })

    it('should handle partial snapshot with nulls', async () => {
      // Arrange
      const jobId = 456
      const snapshot: AnalysisJobVoiceSnapshot = {
        coachGender: 'male',
        coachMode: null,
        voiceNameUsed: null,
        avatarAssetKeyUsed: null,
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      await updateAnalysisJobVoiceSnapshot(jobId, snapshot)

      // Assert
      expect(chain.update).toHaveBeenCalledWith({
        coach_gender: 'male',
        coach_mode: null,
        voice_name_used: null,
        avatar_asset_key_used: null,
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const jobId = 789
      const snapshot: AnalysisJobVoiceSnapshot = {
        coachGender: 'female',
        coachMode: 'zen',
        voiceNameUsed: 'Gacrux',
        avatarAssetKeyUsed: 'female_zen',
      }

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          data: null,
          error: { code: 'PGRST301', message: 'Database connection error' },
        }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act & Assert
      await expect(updateAnalysisJobVoiceSnapshot(jobId, snapshot)).rejects.toThrow(
        'Failed to update analysis job voice snapshot: Database connection error'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Voice Preferences Service',
        'Failed to update analysis job voice snapshot',
        expect.objectContaining({
          code: 'PGRST301',
          jobId,
        })
      )
    })
  })
})
