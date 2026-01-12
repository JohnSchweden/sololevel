/**
 * Voice Configuration Utilities for Edge Functions
 * Provides user preference and voice config lookup for prompt injection
 */

import { createLogger } from '../logger.ts'

const logger = createLogger('voice-config')

export type CoachGender = 'male' | 'female'
export type CoachMode = 'roast' | 'zen' | 'lovebomb'

export interface VoicePreferences {
  coachGender: CoachGender
  coachMode: CoachMode
}

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

export interface AnalysisJobVoiceSnapshot {
  coachGender: CoachGender
  coachMode: CoachMode
  voiceNameUsed: string
  avatarAssetKeyUsed: string
}

/**
 * Get voice preferences for a user from profiles table
 * @param supabase - Supabase client
 * @param userId - The user's UUID
 * @returns The user's voice preferences with defaults applied
 * @throws Error if database query fails
 */
export async function getUserVoicePreferences(
  supabase: any,
  userId: string
): Promise<VoicePreferences> {
  logger.info('Fetching voice preferences', { userId })

  const { data, error } = await supabase
    .from('profiles')
    .select('coach_gender, coach_mode')
    .eq('user_id', userId)
    .single()

  if (error) {
    // If no profile found, use defaults
    if (error.code === 'PGRST116') {
      logger.info('No profile found, using defaults', { userId })
      return {
        coachGender: 'female',
        coachMode: 'roast',
      }
    }

    logger.error('Failed to fetch voice preferences', { error: error.message, userId })
    throw new Error(`Failed to fetch voice preferences: ${error.message}`)
  }

  if (!data) {
    logger.info('No profile data, using defaults', { userId })
    return {
      coachGender: 'female',
      coachMode: 'roast',
    }
  }

  // Apply defaults if columns are null (legacy data)
  const preferences: VoicePreferences = {
    coachGender: (data.coach_gender as CoachGender) || 'female',
    coachMode: (data.coach_mode as CoachMode) || 'roast',
  }

  logger.info('Voice preferences fetched', { userId, preferences })
  return preferences
}

/**
 * Get voice configuration for a specific gender and mode combination
 * @param supabase - Supabase client
 * @param gender - The coach gender ('male' or 'female')
 * @param mode - The coach mode ('roast', 'zen', or 'lovebomb')
 * @returns The voice configuration
 * @throws Error if config not found or database query fails
 */
export async function getVoiceConfig(
  supabase: any,
  gender: CoachGender,
  mode: CoachMode
): Promise<CoachVoiceConfig> {
  logger.info('Fetching voice config', { gender, mode })

  const { data, error } = await supabase
    .from('coach_voice_configs')
    .select('*')
    .eq('gender', gender)
    .eq('mode', mode)
    .eq('is_active', true)
    .single()

  if (error) {
    logger.error('Failed to fetch voice config', { error: error.message, gender, mode })
    throw new Error(`Failed to fetch voice config: ${error.message}`)
  }

  if (!data) {
    logger.error('No voice config found', { gender, mode })
    throw new Error(`No voice config found for gender=${gender}, mode=${mode}`)
  }

  // Map snake_case DB columns to camelCase interface
  const config: CoachVoiceConfig = {
    id: data.id,
    gender: data.gender as CoachGender,
    mode: data.mode as CoachMode,
    voiceName: data.voice_name,
    ttsSystemInstruction: data.tts_system_instruction,
    ssmlSystemInstruction: data.ssml_system_instruction,
    promptVoice: data.prompt_voice,
    promptPersonality: data.prompt_personality,
    avatarAssetKey: data.avatar_asset_key,
  }

  logger.info('Voice config fetched', { configId: config.id, gender, mode, voiceName: config.voiceName })
  return config
}

/**
 * Update voice configuration snapshot on an analysis job
 * Stores the resolved voice config used for this analysis for historical accuracy
 * @param supabase - Supabase client
 * @param jobId - The analysis job ID
 * @param snapshot - The voice configuration snapshot
 * @throws Error if database update fails
 */
export async function updateAnalysisJobVoiceSnapshot(
  supabase: any,
  jobId: number,
  snapshot: AnalysisJobVoiceSnapshot
): Promise<void> {
  logger.info('Updating analysis job voice snapshot', { jobId, snapshot })

  const updates = {
    coach_gender: snapshot.coachGender,
    coach_mode: snapshot.coachMode,
    voice_name_used: snapshot.voiceNameUsed,
    avatar_asset_key_used: snapshot.avatarAssetKeyUsed,
  }

  const { error } = await supabase
    .from('analysis_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    logger.error('Failed to update analysis job voice snapshot', { error: error.message, jobId })
    throw new Error(`Failed to update analysis job voice snapshot: ${error.message}`)
  }

  logger.info('Analysis job voice snapshot updated', { jobId })
}

