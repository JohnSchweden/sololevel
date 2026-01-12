const { createClient } = require('@supabase/supabase-js')
const fs = require('node:fs')
const path = require('node:path')

// Load environment variables from .env.local file (preferred) or .env file
const envLocalPath = path.join(__dirname, '../../.env.local')
const envPath = path.join(__dirname, '../../.env')
const envFile = fs.existsSync(envLocalPath) ? envLocalPath : envPath

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

// Create admin client with service role key for test user management
// Uses SUPABASE_SERVICE_ROLE_KEY from .env.local or .env file
// Falls back to EXPO_PUBLIC_SUPABASE_URL if SUPABASE_URL not found
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EDGE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY or EDGE_SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local/.env file'
  )
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

/**
 * Create a test user with auth and profile
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{userId: string, email: string}>} Created user info
 * @throws {Error} If user creation fails
 */
async function createTestUser(email, password) {
  console.log('📝 Creating test user:', email)

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for testing
  })

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }

  const userId = authData.user.id
  console.log('✅ Test user created:', userId)

  // Check if profile exists (trigger may have created it)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  if (!existingProfile) {
    // Profile doesn't exist - create it manually (trigger may be missing)
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      user_id: userId,
      username: email.split('@')[0],
      coach_gender: null,
      coach_mode: null,
    })

    if (insertError) {
      throw new Error(`Failed to create test user profile: ${insertError.message}`)
    }
  } else {
    // Profile exists - ensure preferences are NULL for first-login test
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ coach_gender: null, coach_mode: null })
      .eq('user_id', userId)

    if (updateError) {
      // Failed to reset profile preferences - non-fatal
    }
  }

  console.log('✅ Test user profile ready (preferences set to NULL)')

  return { userId, email }
}

/**
 * Delete a test user and all related data
 * @param {string} userId - User ID to delete
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails
 */
async function deleteTestUser(userId) {
  console.log('🗑️  Deleting test user:', userId)

  // Delete user (cascades to related tables via foreign keys)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`)
  }

  console.log('✅ Test user deleted:', userId)
}

/**
 * Get voice preferences for a user from the database
 * @param {string} userId - User ID
 * @returns {Promise<{coachGender: string|null, coachMode: string|null}>} Voice preferences
 * @throws {Error} If query fails
 */
async function getUserVoicePreferences(userId) {
  console.log('🔍 Fetching voice preferences for:', userId)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('coach_gender, coach_mode')
    .eq('user_id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch voice preferences: ${error.message}`)
  }

  const preferences = {
    coachGender: data.coach_gender,
    coachMode: data.coach_mode,
  }

  console.log('✅ Voice preferences:', preferences)
  return preferences
}

/**
 * Get the latest analysis job for a user from the database
 * @param {string} userId - User ID
 * @returns {Promise<{id: number, coach_gender: string|null, coach_mode: string|null, voice_name_used: string|null, avatar_asset_key_used: string|null, status: string}>} Latest analysis job
 * @throws {Error} If query fails
 */
async function getLatestAnalysisJob(userId) {
  console.log('🔍 Fetching latest analysis job for:', userId)

  const { data, error } = await supabaseAdmin
    .from('analysis_jobs')
    .select('id, coach_gender, coach_mode, voice_name_used, avatar_asset_key_used, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to fetch analysis job: ${error.message}`)
  }

  console.log('✅ Latest analysis job:', data)
  return data
}

/**
 * Get analysis job by recording ID
 * @param {string} userId - User ID
 * @param {number} recordingId - Recording ID
 * @returns {Promise<{id: number, coach_gender: string|null, coach_mode: string|null, voice_name_used: string|null, avatar_asset_key_used: string|null, status: string}>} Analysis job
 * @throws {Error} If query fails
 */
async function getAnalysisJobByRecordingId(userId, recordingId) {
  console.log('🔍 Fetching analysis job for recording:', recordingId)

  const { data, error } = await supabaseAdmin
    .from('analysis_jobs')
    .select(
      'id, coach_gender, coach_mode, voice_name_used, avatar_asset_key_used, status, video_recording_id'
    )
    .eq('user_id', userId)
    .eq('video_recording_id', recordingId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch analysis job: ${error.message}`)
  }

  console.log('✅ Analysis job for recording:', data)
  return data
}

/**
 * Get analysis job with specific voice config (for finding first pipeline job)
 * @param {string} userId - User ID
 * @param {string} coachGender - Expected coach gender
 * @param {string} coachMode - Expected coach mode
 * @returns {Promise<{id: number, coach_gender: string|null, coach_mode: string|null, voice_name_used: string|null, avatar_asset_key_used: string|null, status: string}>} Analysis job
 * @throws {Error} If query fails
 */
async function getAnalysisJobByVoiceConfig(userId, coachGender, coachMode) {
  console.log('🔍 Fetching analysis job with voice config:', { coachGender, coachMode })

  const { data, error } = await supabaseAdmin
    .from('analysis_jobs')
    .select('id, coach_gender, coach_mode, voice_name_used, avatar_asset_key_used, status')
    .eq('user_id', userId)
    .eq('coach_gender', coachGender)
    .eq('coach_mode', coachMode)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to fetch analysis job: ${error.message}`)
  }

  console.log('✅ Analysis job with voice config:', data)
  return data
}

module.exports = {
  createTestUser,
  deleteTestUser,
  getUserVoicePreferences,
  getLatestAnalysisJob,
  getAnalysisJobByRecordingId,
  getAnalysisJobByVoiceConfig,
}
