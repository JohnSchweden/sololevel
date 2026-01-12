/**
 * Voice Config Service
 * Handles fetching voice configurations from the database
 */

import { log } from '@my/logging'
import { supabase } from '../supabase'

/**
 * Coach gender options
 */
export type CoachGender = 'male' | 'female'

/**
 * Coach mode options
 */
export type CoachMode = 'roast' | 'zen' | 'lovebomb'

/**
 * Voice configuration from the database
 */
export interface CoachVoiceConfig {
  id: number
  gender: CoachGender
  mode: CoachMode
  voiceName: string
  ttsSystemInstruction: string
  ssmlSystemInstruction: string
  promptVoice: string
  promptPersonality: string
  avatarAssetKey: string
}

/**
 * Get voice configuration for a specific gender and mode combination
 * @param gender - The coach gender ('male' or 'female')
 * @param mode - The coach mode ('roast', 'zen', or 'lovebomb')
 * @returns The voice configuration or null if not found (or inactive)
 * @throws Error if database query fails
 */
export async function getVoiceConfig(
  gender: CoachGender,
  mode: CoachMode
): Promise<CoachVoiceConfig | null> {
  try {
    log.info('Voice Config Service', 'Fetching voice config', { gender, mode })

    // Type assertion: table exists in DB but types may not be regenerated yet
    // TODO: Verify types after Supabase CLI type generation picks up the table
    const { data, error } = await (supabase.from as any)('coach_voice_configs')
      .select('*')
      .eq('gender', gender)
      .eq('mode', mode)
      .eq('is_active', true)
      .single()

    if (error) {
      // If no rows found, return null (not an error)
      if (error.code === 'PGRST116') {
        log.info('Voice Config Service', 'No active config found', { gender, mode })
        return null
      }

      log.error('Voice Config Service', 'Failed to fetch voice config', {
        error: error.message,
        code: error.code,
        gender,
        mode,
      })
      throw new Error(`Failed to fetch voice config: ${error.message}`)
    }

    if (!data) {
      log.info('Voice Config Service', 'No config found', { gender, mode })
      return null
    }

    // Map snake_case DB columns to camelCase interface
    // Type assertion: table structure matches what we defined in migration
    const dbData = data as {
      id: number
      gender: string
      mode: string
      voice_name: string
      tts_system_instruction: string
      ssml_system_instruction: string
      prompt_voice: string
      prompt_personality: string
      avatar_asset_key: string
    }

    const config: CoachVoiceConfig = {
      id: dbData.id,
      gender: dbData.gender as CoachGender,
      mode: dbData.mode as CoachMode,
      voiceName: dbData.voice_name,
      ttsSystemInstruction: dbData.tts_system_instruction,
      ssmlSystemInstruction: dbData.ssml_system_instruction,
      promptVoice: dbData.prompt_voice,
      promptPersonality: dbData.prompt_personality,
      avatarAssetKey: dbData.avatar_asset_key,
    }

    log.info('Voice Config Service', 'Voice config fetched successfully', {
      configId: config.id,
      gender,
      mode,
      voiceName: config.voiceName,
    })

    return config
  } catch (error) {
    // Re-throw if already an Error with our message
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw error
    }

    // Log and wrap unexpected errors
    log.error('Voice Config Service', 'Unexpected error fetching voice config', {
      error: error instanceof Error ? error.message : 'Unknown error',
      gender,
      mode,
    })
    throw new Error(
      `Unexpected error fetching voice config: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
