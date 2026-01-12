/**
 * Voice Preferences Service
 * Manages user voice preferences and analysis job voice snapshots
 */

import { log } from '@my/logging'
import { supabase } from '../supabase'
import type { CoachGender, CoachMode } from './voiceConfigService'

/**
 * User voice preferences
 */
export interface VoicePreferences {
  coachGender: CoachGender
  coachMode: CoachMode
}

/**
 * Partial update for voice preferences
 */
export interface VoicePreferencesUpdate {
  coachGender?: CoachGender
  coachMode?: CoachMode
}

/**
 * Voice configuration snapshot stored on analysis jobs for historical accuracy
 */
export interface AnalysisJobVoiceSnapshot {
  coachGender: CoachGender | null
  coachMode: CoachMode | null
  voiceNameUsed: string | null
  avatarAssetKeyUsed: string | null
}

/**
 * Check if user has set voice preferences
 * Used for first-login detection - redirects to voice selection if false
 * @param userId - The user's UUID
 * @returns True if coach_mode is set, false if null (first login)
 * @throws Error if database query fails
 */
export async function hasUserSetVoicePreferences(userId: string): Promise<boolean> {
  try {
    log.info('Voice Preferences Service', 'Checking if user has set preferences', { userId })

    // Type assertion: columns exist in DB but types may not be regenerated yet
    const { data, error } = await (supabase.from as any)('profiles')
      .select('coach_mode')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no rows found, treat as no preferences set
      if (error.code === 'PGRST116') {
        log.info('Voice Preferences Service', 'No profile found for user', { userId })
        return false
      }

      log.error('Voice Preferences Service', 'Failed to check voice preferences', {
        error: error.message,
        code: error.code,
        userId,
      })
      throw new Error(`Failed to check voice preferences: ${error.message}`)
    }

    if (!data) {
      log.info('Voice Preferences Service', 'No profile found for user', { userId })
      return false
    }

    const hasPreferences = data.coach_mode !== null
    log.info('Voice Preferences Service', 'Checked voice preferences', {
      userId,
      hasPreferences,
    })

    return hasPreferences
  } catch (error) {
    // Re-throw if already an Error with our message
    if (error instanceof Error && error.message.includes('Failed to check')) {
      throw error
    }

    // Log and wrap unexpected errors
    log.error('Voice Preferences Service', 'Unexpected error checking voice preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    })
    throw new Error(
      `Unexpected error checking voice preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get voice preferences for a user
 * @param userId - The user's UUID
 * @returns The user's voice preferences or null if user not found
 * @throws Error if database query fails
 */
export async function getUserVoicePreferences(userId: string): Promise<VoicePreferences | null> {
  try {
    log.info('Voice Preferences Service', 'Fetching voice preferences', { userId })

    // Type assertion: columns exist in DB but types may not be regenerated yet
    const { data, error } = await (supabase.from as any)('profiles')
      .select('coach_gender, coach_mode')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no rows found, return null (not an error)
      if (error.code === 'PGRST116') {
        log.info('Voice Preferences Service', 'No profile found for user', { userId })
        return null
      }

      log.error('Voice Preferences Service', 'Failed to fetch voice preferences', {
        error: error.message,
        code: error.code,
        userId,
      })
      throw new Error(`Failed to fetch voice preferences: ${error.message}`)
    }

    if (!data) {
      log.info('Voice Preferences Service', 'No profile found for user', { userId })
      return null
    }

    // Map snake_case DB columns to camelCase interface
    // Apply defaults if columns are null (legacy data)
    const dbData = data as {
      coach_gender: string | null
      coach_mode: string | null
    }

    const preferences: VoicePreferences = {
      coachGender: (dbData.coach_gender as CoachGender) || 'female',
      coachMode: (dbData.coach_mode as CoachMode) || 'roast',
    }

    log.info('Voice Preferences Service', 'Voice preferences fetched successfully', {
      userId,
      preferences,
    })

    return preferences
  } catch (error) {
    // Re-throw if already an Error with our message
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw error
    }

    // Log and wrap unexpected errors
    log.error('Voice Preferences Service', 'Unexpected error fetching voice preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    })
    throw new Error(
      `Unexpected error fetching voice preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Update voice preferences for a user
 * @param userId - The user's UUID
 * @param preferences - Partial preferences to update
 * @returns The updated preferences
 * @throws Error if database update fails
 */
export async function updateVoicePreferences(
  userId: string,
  preferences: VoicePreferencesUpdate
): Promise<VoicePreferences> {
  try {
    log.info('Voice Preferences Service', 'Updating voice preferences', {
      userId,
      preferences,
    })

    // Build update object with snake_case column names
    const updates: Record<string, string> = {}
    if (preferences.coachGender !== undefined) {
      updates.coach_gender = preferences.coachGender
    }
    if (preferences.coachMode !== undefined) {
      updates.coach_mode = preferences.coachMode
    }

    // Type assertion: columns exist in DB but types may not be regenerated yet
    const { data, error } = await (supabase.from as any)('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select('coach_gender, coach_mode')
      .single()

    if (error) {
      log.error('Voice Preferences Service', 'Failed to update voice preferences', {
        error: error.message,
        code: error.code,
        userId,
        preferences,
      })
      throw new Error(`Failed to update voice preferences: ${error.message}`)
    }

    if (!data) {
      throw new Error('No profile found for user')
    }

    // Map snake_case DB columns to camelCase interface
    const dbData = data as {
      coach_gender: string
      coach_mode: string
    }

    const updatedPreferences: VoicePreferences = {
      coachGender: dbData.coach_gender as CoachGender,
      coachMode: dbData.coach_mode as CoachMode,
    }

    log.info('Voice Preferences Service', 'Voice preferences updated successfully', {
      userId,
      updatedPreferences,
    })

    return updatedPreferences
  } catch (error) {
    // Re-throw if already an Error with our message
    if (error instanceof Error && error.message.includes('Failed to update')) {
      throw error
    }

    // Log and wrap unexpected errors
    log.error('Voice Preferences Service', 'Unexpected error updating voice preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      preferences,
    })
    throw new Error(
      `Unexpected error updating voice preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Update voice configuration snapshot on an analysis job
 * Stores the resolved voice config used for this analysis for historical accuracy
 * @param jobId - The analysis job ID
 * @param snapshot - The voice configuration snapshot
 * @throws Error if database update fails
 */
export async function updateAnalysisJobVoiceSnapshot(
  jobId: number,
  snapshot: AnalysisJobVoiceSnapshot
): Promise<void> {
  try {
    log.info('Voice Preferences Service', 'Updating analysis job voice snapshot', {
      jobId,
      snapshot,
    })

    // Build update object with snake_case column names
    const updates = {
      coach_gender: snapshot.coachGender,
      coach_mode: snapshot.coachMode,
      voice_name_used: snapshot.voiceNameUsed,
      avatar_asset_key_used: snapshot.avatarAssetKeyUsed,
    }

    // Type assertion: columns exist in DB but types may not be regenerated yet
    const { error } = await (supabase.from as any)('analysis_jobs').update(updates).eq('id', jobId)

    if (error) {
      log.error('Voice Preferences Service', 'Failed to update analysis job voice snapshot', {
        error: error.message,
        code: error.code,
        jobId,
        snapshot,
      })
      throw new Error(`Failed to update analysis job voice snapshot: ${error.message}`)
    }

    log.info('Voice Preferences Service', 'Analysis job voice snapshot updated successfully', {
      jobId,
    })
  } catch (error) {
    // Re-throw if already an Error with our message
    if (error instanceof Error && error.message.includes('Failed to update')) {
      throw error
    }

    // Log and wrap unexpected errors
    log.error(
      'Voice Preferences Service',
      'Unexpected error updating analysis job voice snapshot',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        snapshot,
      }
    )
    throw new Error(
      `Unexpected error updating analysis job voice snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
