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
 * Supported audio formats
 */
export type AudioFormat = 'aac' | 'mp3'

/**
 * Audio format metadata including MIME types and file extensions
 */
export const AUDIO_FORMATS: Record<AudioFormat, {
  mime: string
  extension: string
  container: 'm4a' | 'mp3'
}> = {
  aac: { mime: 'audio/aac', extension: 'm4a', container: 'm4a' },
  mp3: { mime: 'audio/mpeg', extension: 'mp3', container: 'mp3' },
}

/**
 * Provider capabilities for audio formats
 */
export const PROVIDER_CAPS: Record<'gemini' | 'azure' | 'elevenlabs', AudioFormat[]> = {
  gemini: ['aac', 'mp3'],
  azure: ['aac', 'mp3'],
  elevenlabs: ['aac', 'mp3'],
}

/**
 * Get default audio format from environment
 * Defaults to AAC (primary format)
 */
export function getEnvDefaultFormat(): AudioFormat {
  const val = (Deno?.env?.get('SUPABASE_TTS_DEFAULT_FORMAT') ?? 'aac').toLowerCase()
  if (['aac','mp3'].includes(val)) return val as AudioFormat
  return 'aac'
}

/**
 * Get allowed audio formats from environment
 * Defaults to AAC and MP3 (AAC primary)
 */
export function getEnvAllowedFormats(): AudioFormat[] {
  const raw = Deno?.env?.get('SUPABASE_TTS_ALLOWED_FORMATS') ?? 'aac,mp3'
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const validFormats: AudioFormat[] = list.filter(f => ['aac','mp3'].includes(f)) as AudioFormat[]
  const set = new Set(validFormats)
  return set.size ? [...set] : ['aac', 'mp3']
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
