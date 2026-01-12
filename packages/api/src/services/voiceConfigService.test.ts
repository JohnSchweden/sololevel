/**
 * TDD Tests for Voice Config Service
 * Tests fetching voice configurations from the database
 */

import { log } from '@my/logging'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../supabase'
import { type CoachGender, type CoachMode, getVoiceConfig } from './voiceConfigService'

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

describe('voiceConfigService', () => {
  describe('getVoiceConfig', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup mock query chain
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)
    })

    it('should return config for valid gender/mode combination', async () => {
      // Arrange
      const mockConfig = {
        id: 1,
        gender: 'female' as CoachGender,
        mode: 'roast' as CoachMode,
        voice_name: 'Aoede',
        tts_system_instruction: 'Use a funny north european accent.',
        ssml_system_instruction:
          'You are a sarcastic comedian with sharp wit. Format the text with comedic timing.',
        prompt_voice: '"Roast me!!!" Use playful insults and biting humour.',
        prompt_personality: 'Ruthless/Sharp Insight with north european wit',
        avatar_asset_key: 'female_roast',
        is_active: true,
        created_at: '2025-01-07T12:00:00Z',
        updated_at: '2025-01-07T12:00:00Z',
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockConfig, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getVoiceConfig('female', 'roast')

      // Assert
      expect(mockSupabaseFrom).toHaveBeenCalledWith('coach_voice_configs')
      expect(chain.select).toHaveBeenCalledWith('*')
      expect(chain.eq).toHaveBeenCalledWith('gender', 'female')
      expect(chain.eq).toHaveBeenCalledWith('mode', 'roast')
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(chain.single).toHaveBeenCalledTimes(1)

      expect(result).toEqual({
        id: 1,
        gender: 'female',
        mode: 'roast',
        voiceName: 'Aoede',
        ttsSystemInstruction: 'Use a funny north european accent.',
        ssmlSystemInstruction:
          'You are a sarcastic comedian with sharp wit. Format the text with comedic timing.',
        promptVoice: '"Roast me!!!" Use playful insults and biting humour.',
        promptPersonality: 'Ruthless/Sharp Insight with north european wit',
        avatarAssetKey: 'female_roast',
      })
    })

    it('should return null for inactive config', async () => {
      // Arrange
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
      const result = await getVoiceConfig('male', 'zen')

      // Assert
      expect(result).toBeNull()
      expect(log.info).toHaveBeenCalledWith('Voice Config Service', 'No active config found', {
        gender: 'male',
        mode: 'zen',
      })
    })

    it('should return null when no config exists', async () => {
      // Arrange
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getVoiceConfig('female', 'lovebomb')

      // Assert
      expect(result).toBeNull()
      expect(log.info).toHaveBeenCalledWith('Voice Config Service', 'No config found', {
        gender: 'female',
        mode: 'lovebomb',
      })
    })

    it('should map snake_case DB columns to camelCase interface', async () => {
      // Arrange
      const mockConfig = {
        id: 2,
        gender: 'male' as CoachGender,
        mode: 'zen' as CoachMode,
        voice_name: 'Algieba',
        tts_system_instruction: 'Use a balanced soft british accent.',
        ssml_system_instruction:
          'You are a calm meditation guide. Use measured pacing and gentle pauses.',
        prompt_voice: 'Zen me. Calm, mindful coaching.',
        prompt_personality: 'Peaceful/Supportive Guide',
        avatar_asset_key: 'male_zen',
        is_active: true,
        created_at: '2025-01-07T12:00:00Z',
        updated_at: '2025-01-07T12:00:00Z',
      }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue({ data: mockConfig, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(chain)

      // Act
      const result = await getVoiceConfig('male', 'zen')

      // Assert
      expect(result).toEqual({
        id: 2,
        gender: 'male',
        mode: 'zen',
        voiceName: 'Algieba',
        ttsSystemInstruction: 'Use a balanced soft british accent.',
        ssmlSystemInstruction:
          'You are a calm meditation guide. Use measured pacing and gentle pauses.',
        promptVoice: 'Zen me. Calm, mindful coaching.',
        promptPersonality: 'Peaceful/Supportive Guide',
        avatarAssetKey: 'male_zen',
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
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
      await expect(getVoiceConfig('female', 'roast')).rejects.toThrow(
        'Failed to fetch voice config: Database connection error'
      )
      expect(log.error).toHaveBeenCalledWith(
        'Voice Config Service',
        'Failed to fetch voice config',
        expect.objectContaining({
          code: 'PGRST301',
          gender: 'female',
          mode: 'roast',
        })
      )
    })

    it('should handle all valid gender/mode combinations', async () => {
      // Arrange
      const combinations: Array<[CoachGender, CoachMode]> = [
        ['female', 'roast'],
        ['female', 'zen'],
        ['female', 'lovebomb'],
        ['male', 'roast'],
        ['male', 'zen'],
        ['male', 'lovebomb'],
      ]

      const mockConfig = {
        id: 1,
        gender: 'female',
        mode: 'roast',
        voice_name: 'Aoede',
        tts_system_instruction: 'Test',
        ssml_system_instruction: 'Test SSML instruction',
        prompt_voice: 'Test',
        prompt_personality: 'Test',
        avatar_asset_key: 'test',
        is_active: true,
        created_at: '2025-01-07T12:00:00Z',
        updated_at: '2025-01-07T12:00:00Z',
      }

      for (const [gender, mode] of combinations) {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnValue({
            data: { ...mockConfig, gender, mode },
            error: null,
          }),
        }
        mockSupabaseFrom.mockReturnValue(chain)

        // Act
        const result = await getVoiceConfig(gender, mode)

        // Assert
        expect(result).not.toBeNull()
        expect(result?.gender).toBe(gender)
        expect(result?.mode).toBe(mode)
      }
    })
  })
})
