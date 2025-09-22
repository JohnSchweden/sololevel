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
      const expectedFormats: AudioFormat[] = ['wav', 'mp3']
      expectedFormats.forEach(format => {
        expect(AUDIO_FORMATS[format]).toBeDefined()
        expect(AUDIO_FORMATS[format]).toHaveProperty('mimes')
        expect(AUDIO_FORMATS[format]).toHaveProperty('extension')
        expect(AUDIO_FORMATS[format]).toHaveProperty('container')
      })
    })

    it('should have correct MIME types', () => {
      expect(AUDIO_FORMATS.mp3.mimes[0]).toBe('audio/mpeg')
      expect(AUDIO_FORMATS.wav.mimes[0]).toBe('audio/wav')
    })

    it('should have correct file extensions', () => {
      expect(AUDIO_FORMATS.mp3.extension).toBe('mp3')
      expect(AUDIO_FORMATS.wav.extension).toBe('wav')
    })

    it('should have correct container types', () => {
      expect(AUDIO_FORMATS.mp3.container).toBe('mp3')
      expect(AUDIO_FORMATS.wav.container).toBe('wav')
    })
  })

  describe('PROVIDER_CAPS', () => {
    it('should define capabilities for all supported providers', () => {
      const providers = ['gemini', 'azure', 'elevenlabs'] as const
      providers.forEach(provider => {
        expect(PROVIDER_CAPS[provider]).toBeInstanceOf(Array)
        expect(PROVIDER_CAPS[provider].length).toBeGreaterThan(0)
        PROVIDER_CAPS[provider].forEach(format => {
          expect(['wav', 'mp3']).toContain(format)
        })
      })
    })

    it('should have correct Gemini capabilities', () => {
      expect(PROVIDER_CAPS.gemini).toEqual(['wav', 'mp3'])
    })

    it('should have correct Azure capabilities', () => {
      expect(PROVIDER_CAPS.azure).toEqual(['wav', 'mp3'])
    })

    it('should have correct ElevenLabs capabilities', () => {
      expect(PROVIDER_CAPS.elevenlabs).toEqual(['wav', 'mp3'])
    })
  })

  describe('getEnvDefaultFormat', () => {
    it('should return MP3 when no env var is set', () => {
      mockEnv.mockReturnValue(undefined)
      expect(getEnvDefaultFormat()).toBe('mp3')
    })

    it('should return the configured format when env var is set', () => {
      mockEnv.mockReturnValue('mp3')
      expect(getEnvDefaultFormat()).toBe('mp3')

      mockEnv.mockReturnValue('wav')
      expect(getEnvDefaultFormat()).toBe('wav')
    })

    it('should handle case insensitive input', () => {
      mockEnv.mockReturnValue('WAV')
      expect(getEnvDefaultFormat()).toBe('wav')

      mockEnv.mockReturnValue('Mp3')
      expect(getEnvDefaultFormat()).toBe('mp3')
    })

    it('should fallback to MP3 for invalid values', () => {
      mockEnv.mockReturnValue('invalid')
      expect(getEnvDefaultFormat()).toBe('mp3')

      mockEnv.mockReturnValue('')
      expect(getEnvDefaultFormat()).toBe('mp3')

      mockEnv.mockReturnValue('aac')
      expect(getEnvDefaultFormat()).toBe('mp3')
    })
  })

  describe('getEnvAllowedFormats', () => {
    it('should return MP3 and WAV when no env var is set', () => {
      mockEnv.mockReturnValue(undefined)
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should parse comma-separated format list', () => {
      mockEnv.mockReturnValue('mp3,wav')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should handle spaces around commas', () => {
      mockEnv.mockReturnValue(' mp3 , wav ')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should filter out invalid formats', () => {
      mockEnv.mockReturnValue('mp3,invalid,wav')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should handle case insensitive input', () => {
      mockEnv.mockReturnValue('MP3,WAV')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should fallback to MP3 and WAV when all formats are invalid', () => {
      mockEnv.mockReturnValue('invalid1,invalid2')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })

    it('should remove duplicates', () => {
      mockEnv.mockReturnValue('mp3,wav,mp3,wav')
      expect(getEnvAllowedFormats()).toEqual(['mp3', 'wav'])
    })
  })

  describe('resolveAudioFormat', () => {
    it('should return first preferred format that provider supports', () => {
      expect(resolveAudioFormat(['mp3', 'wav'], 'gemini')).toBe('mp3')
      expect(resolveAudioFormat(['wav', 'mp3'], 'gemini')).toBe('wav')
      expect(resolveAudioFormat(['wav', 'mp3'], 'azure')).toBe('wav')
    })

    it('should use environment defaults when no preferences provided', () => {
      mockEnv.mockReturnValue('wav') // SUPABASE_TTS_DEFAULT_FORMAT
      expect(resolveAudioFormat(undefined, 'gemini')).toBe('wav')

      mockEnv.mockReturnValue('mp3')
      expect(resolveAudioFormat(undefined, 'azure')).toBe('mp3')
    })

    it('should fallback to provider first supported format when no preferred formats match', () => {
      expect(resolveAudioFormat(['invalid'] as any, 'gemini')).toBe('wav') // Provider's first format
      expect(resolveAudioFormat(['invalid'] as any, 'azure')).toBe('wav') // Provider's first format
      expect(resolveAudioFormat(['invalid'] as any, 'elevenlabs')).toBe('wav') // Provider's first format
    })

    it('should prioritize order in preferred formats', () => {
      expect(resolveAudioFormat(['mp3', 'wav'], 'gemini')).toBe('mp3') // mp3 comes first
      expect(resolveAudioFormat(['wav', 'mp3'], 'azure')).toBe('wav') // wav comes first
    })

    it('should handle empty preferred formats array', () => {
      mockEnv.mockReturnValue(undefined) // Ensure no env vars set
      expect(resolveAudioFormat([], 'gemini')).toBe('mp3') // Falls back to env defaults (mp3 first)
    })
  })
})
