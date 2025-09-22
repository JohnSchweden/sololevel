/**
 * Audio Format Configuration Tests
 * Tests for centralized audio format management
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUDIO_FORMATS,
  AudioFormat,
  PROVIDER_CAPS,
  getEnvAllowedFormats,
  getEnvDefaultFormat,
  resolveAudioFormat
} from './audio.ts'

// Mock Deno environment
const mockEnv = vi.fn()
vi.stubGlobal('Deno', { env: { get: mockEnv } })

describe('Audio Format Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AUDIO_FORMATS', () => {
    it('should contain all supported audio formats', () => {
      const expectedFormats: AudioFormat[] = ['mp3', 'aac']
      expectedFormats.forEach(format => {
        expect(AUDIO_FORMATS[format]).toBeDefined()
        expect(AUDIO_FORMATS[format]).toHaveProperty('mime')
        expect(AUDIO_FORMATS[format]).toHaveProperty('extension')
        expect(AUDIO_FORMATS[format]).toHaveProperty('container')
      })
    })

    it('should have correct MIME types', () => {
      expect(AUDIO_FORMATS.mp3.mime).toBe('audio/mpeg')
      expect(AUDIO_FORMATS.aac.mime).toBe('audio/aac')
    })

    it('should have correct file extensions', () => {
      expect(AUDIO_FORMATS.mp3.extension).toBe('mp3')
      expect(AUDIO_FORMATS.aac.extension).toBe('m4a')
    })

    it('should have correct container types', () => {
      expect(AUDIO_FORMATS.mp3.container).toBe('mp3')
      expect(AUDIO_FORMATS.aac.container).toBe('m4a')
    })
  })

  describe('PROVIDER_CAPS', () => {
    it('should define capabilities for all supported providers', () => {
      const providers = ['gemini', 'azure', 'elevenlabs'] as const
      providers.forEach(provider => {
        expect(PROVIDER_CAPS[provider]).toBeInstanceOf(Array)
        expect(PROVIDER_CAPS[provider].length).toBeGreaterThan(0)
        PROVIDER_CAPS[provider].forEach(format => {
          expect(['mp3', 'aac']).toContain(format)
        })
      })
    })

    it('should have correct Gemini capabilities', () => {
      expect(PROVIDER_CAPS.gemini).toEqual(['aac', 'mp3'])
    })

    it('should have correct Azure capabilities', () => {
      expect(PROVIDER_CAPS.azure).toEqual(['aac', 'mp3'])
    })

    it('should have correct ElevenLabs capabilities', () => {
      expect(PROVIDER_CAPS.elevenlabs).toEqual(['aac', 'mp3'])
    })
  })

  describe('getEnvDefaultFormat', () => {
    it('should return AAC when no env var is set', () => {
      mockEnv.mockReturnValue(undefined)
      expect(getEnvDefaultFormat()).toBe('aac')
    })

    it('should return the configured format when env var is set', () => {
      mockEnv.mockReturnValue('mp3')
      expect(getEnvDefaultFormat()).toBe('mp3')

      mockEnv.mockReturnValue('aac')
      expect(getEnvDefaultFormat()).toBe('aac')
    })

    it('should handle case insensitive input', () => {
      mockEnv.mockReturnValue('AAC')
      expect(getEnvDefaultFormat()).toBe('aac')

      mockEnv.mockReturnValue('Mp3')
      expect(getEnvDefaultFormat()).toBe('mp3')
    })

    it('should fallback to AAC for invalid values', () => {
      mockEnv.mockReturnValue('invalid')
      expect(getEnvDefaultFormat()).toBe('aac')

      mockEnv.mockReturnValue('')
      expect(getEnvDefaultFormat()).toBe('aac')

      mockEnv.mockReturnValue('wav')
      expect(getEnvDefaultFormat()).toBe('aac')
    })
  })

  describe('getEnvAllowedFormats', () => {
    it('should return AAC and MP3 when no env var is set', () => {
      mockEnv.mockReturnValue(undefined)
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should parse comma-separated format list', () => {
      mockEnv.mockReturnValue('aac,mp3')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should handle spaces around commas', () => {
      mockEnv.mockReturnValue(' aac , mp3 ')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should filter out invalid formats', () => {
      mockEnv.mockReturnValue('aac,invalid,mp3')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should handle case insensitive input', () => {
      mockEnv.mockReturnValue('AAC,MP3')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should fallback to AAC and MP3 when all formats are invalid', () => {
      mockEnv.mockReturnValue('invalid1,invalid2')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })

    it('should remove duplicates', () => {
      mockEnv.mockReturnValue('aac,mp3,aac,mp3')
      expect(getEnvAllowedFormats()).toEqual(['aac', 'mp3'])
    })
  })

  describe('resolveAudioFormat', () => {
    it('should return first preferred format that provider supports', () => {
      expect(resolveAudioFormat(['mp3', 'aac'], 'gemini')).toBe('mp3')
      expect(resolveAudioFormat(['aac', 'mp3'], 'gemini')).toBe('aac')
      expect(resolveAudioFormat(['aac', 'mp3'], 'azure')).toBe('aac')
    })

    it('should use environment defaults when no preferences provided', () => {
      mockEnv.mockReturnValue('aac') // SUPABASE_TTS_DEFAULT_FORMAT
      expect(resolveAudioFormat(undefined, 'gemini')).toBe('aac')

      mockEnv.mockReturnValue('mp3')
      expect(resolveAudioFormat(undefined, 'azure')).toBe('mp3')
    })

    it('should fallback to provider first supported format when no preferred formats match', () => {
      expect(resolveAudioFormat(['invalid'] as any, 'gemini')).toBe('aac') // Provider's first format
      expect(resolveAudioFormat(['invalid'] as any, 'azure')).toBe('aac') // Provider's first format
    })

    it('should prioritize order in preferred formats', () => {
      expect(resolveAudioFormat(['mp3', 'aac'], 'gemini')).toBe('mp3') // mp3 comes first
      expect(resolveAudioFormat(['aac', 'mp3'], 'azure')).toBe('aac') // aac comes first
    })

    it('should handle empty preferred formats array', () => {
      mockEnv.mockReturnValue(undefined) // Ensure no env vars set
      expect(resolveAudioFormat([], 'gemini')).toBe('aac') // Falls back to env defaults (aac first)
    })
  })
})
