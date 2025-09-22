/**
 * Audio Format Configuration and Validation
 * Single source of truth for audio formats, MIME types, and provider capabilities
 */

// Import Deno environment access
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

/**
 * Audio format metadata including MIME types and file extensions
 */
export const AUDIO_FORMATS = {
  wav: {
    mimes: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    extension: 'wav',
    container: 'wav' as const
  },
  mp3: {
    mimes: ['audio/mpeg'],
    extension: 'mp3',
    container: 'mp3' as const
  },
} as const

/**
 * Supported audio formats
 */
export type AudioFormat = keyof typeof AUDIO_FORMATS

/**
 * All available audio formats
 */
const ALL_FORMATS = Object.keys(AUDIO_FORMATS) as AudioFormat[]

/**
 * Default allowed formats in preference order (MP3 first for better compression)
 */
const DEFAULT_ALLOWED: readonly AudioFormat[] = ['mp3', 'wav']

/**
 * Default format (first in preference order)
 */
const DEFAULT_FORMAT: AudioFormat = DEFAULT_ALLOWED[0]

/**
 * Provider capabilities for audio formats
 */
export const PROVIDER_CAPS: Record<'gemini' | 'azure' | 'elevenlabs', readonly AudioFormat[]> = {
  gemini: ALL_FORMATS,
  azure: ALL_FORMATS,
  elevenlabs: ALL_FORMATS,
}

/**
 * Parse allowed formats from environment string
 */
function parseEnvAllowedFormats(env: string | undefined): AudioFormat[] {
  const raw = env?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? []
  const set = new Set(raw.filter((f): f is AudioFormat => ALL_FORMATS.includes(f as AudioFormat)))
  return set.size ? [...set] : [...DEFAULT_ALLOWED]
}

/**
 * Get allowed audio formats from environment
 * Defaults to MP3 and WAV (MP3 primary)
 */
export function getEnvAllowedFormats(): AudioFormat[] {
  return parseEnvAllowedFormats(Deno?.env?.get('TTS_ALLOWED_FORMATS'))
}

/**
 * Get default audio format from environment
 * Defaults to MP3 (better compression than WAV)
 */
export function getEnvDefaultFormat(): AudioFormat {
  const val = Deno?.env?.get('TTS_DEFAULT_FORMAT')?.toLowerCase()
  return val && ALL_FORMATS.includes(val as AudioFormat) ? (val as AudioFormat) : DEFAULT_FORMAT
}

/**
 * Resolve the best audio format given preferred order and provider capabilities
 * Falls back to provider's first supported format if no preferred formats are supported
 */
export function resolveAudioFormat(
  preferredOrder: AudioFormat[] | undefined,
  provider: keyof typeof PROVIDER_CAPS
): AudioFormat {
  const allowed = (preferredOrder && preferredOrder.length > 0) ? preferredOrder : getEnvAllowedFormats()
  const caps = new Set(PROVIDER_CAPS[provider])

  for (const fmt of allowed) if (caps.has(fmt)) return fmt

  // Fallback to provider's first supported format
  return PROVIDER_CAPS[provider][0]
}

/**
 * Validate that content type matches the expected MIME type for a format
 */
export function validateAudioContentType(contentType: string, expectedFormat: AudioFormat): boolean {
  const normalizedContentType = contentType.toLowerCase()
  return (AUDIO_FORMATS[expectedFormat].mimes as readonly string[]).includes(normalizedContentType)
}

/**
 * Get expected content type for a given audio format
 */
export function getAudioContentType(format: AudioFormat): string {
  return AUDIO_FORMATS[format].mimes[0]
}

/**
 * Validate file extension matches the format
 */
export function validateAudioFileExtension(filename: string, format: AudioFormat): boolean {
  const expectedExt = AUDIO_FORMATS[format].extension
  const fileExt = filename.toLowerCase().split('.').pop()
  return fileExt === expectedExt
}
