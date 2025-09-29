#!/usr/bin/env node

/**
 * Extended Smoke Test: Video Upload with Database Record Creation
 * Tests video upload to Supabase raw bucket AND creates a video_recordings table entry
 * Demonstrates the complete upload pipeline from file to database record
 */

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createAdminClient, getScriptConfig } from '../utils/env.mjs'
import { uploadTestVideo } from './smoke-upload.mjs'
import { createSmokeAnonClient, createSmokeServiceClient } from './smoke-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

// Load and validate environment configuration
const config = getScriptConfig()

// Global variables for shared functions
let supabase = null

async function initializeSmokeTest() {
  if (!supabase) {
    // Create Supabase admin client with service role using centralized function
    supabase = await createAdminClient()
  }
  return supabase
}


async function createVideoRecordingRecord() {
  await initializeSmokeTest()

  try {
    // Get test user ID (from the seeded user)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      console.error('❌ Error getting test user:', userError.message)
      return null
    }

    const testUser = users.users.find(user => user.email === config.testAuth.email)
    if (!testUser) {
      console.error('❌ Test user not found')
      return null
    }

    // Get video info using the shared upload function (but don't upload yet)
    // We'll modify this to just get the buffer without uploading
    const videoPath = join(projectRoot, 'test-assets', 'videos', 'mini_speech.mp4')
    const { readFileSync } = await import('fs')
    const videoBuffer = readFileSync(videoPath)
    const fileName = `smoke-upload-${Date.now()}.mp4`
    const storagePath = `${testUser.id}/${fileName}`

    console.log(`📁 Found test video: ${videoPath} (${videoBuffer.length} bytes)`)

    // 1. Create video recording record first (with pending status)
    const videoRecord = {
      user_id: testUser.id,
      filename: fileName,
      original_filename: 'mini_speech.mp4',
      file_size: videoBuffer.length,
      duration_seconds: 30, // Test video is approximately 30 seconds
      format: 'mp4',
      storage_path: storagePath,
      upload_status: 'pending', // ← Starts as pending
      upload_progress: 0
    }

    const { data, error } = await supabase
      .from('video_recordings')
      .insert(videoRecord)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating video recording record:', error.message)
      return null
    }

    console.log(`✅ Created video recording record: ID ${data.id} (status: ${data.upload_status})`)
    return {
      recording: data,
      videoBuffer,
      fileName,
      storagePath,
      testUser
    }

  } catch (error) {
    console.error('❌ Error creating video recording:', error.message)
    return null
  }
}

async function uploadVideoToStorage(recordingData) {
  try {
    console.log(`⬆️ Uploading video to storage: ${recordingData.storagePath}`)

    // Use service role client to bypass permission issues
    const serviceSupabase = await createSmokeServiceClient()

    // 1. Upload to temp path first (service role can upload anywhere)
    const tempPath = `temp/smoke-upload-${Date.now()}.mp4`
    console.log(`📤 Uploading to temp path: ${tempPath}`)

    const { error: uploadError } = await serviceSupabase.storage
      .from('raw')
      .upload(tempPath, recordingData.videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Temp upload failed:', uploadError.message)
      return null
    }

    console.log(`✅ Temp upload successful`)

    // 2. Move from temp to final user-scoped path
    console.log(`🔄 Moving from ${tempPath} to ${recordingData.storagePath}`)

    const { error: moveError } = await serviceSupabase.storage
      .from('raw')
      .move(tempPath, recordingData.storagePath)

    if (moveError) {
      console.error('❌ Move failed:', moveError.message)
      return null
    }

    console.log(`✅ File moved to final path: ${recordingData.storagePath}`)

    // 3. Update database record status to completed
    console.log(`📝 Updating database record status to completed`)

    // Use direct SQL to avoid any Supabase client upsert behavior
    const { createDbClient } = await import('../utils/env.mjs')
    const dbClient = await createDbClient()
    await dbClient.connect()

    try {
      await dbClient.query(
        'UPDATE public.video_recordings SET upload_status = $1, upload_progress = $2, updated_at = now() WHERE id = $3',
        ['completed', 100, recordingData.recording.id]
      )
      console.log(`✅ Database record updated to completed`)
    } catch (dbError) {
      console.error('❌ Direct SQL update failed:', dbError.message)
      return null
    } finally {
      await dbClient.end()
    }
    return { path: recordingData.storagePath }

  } catch (error) {
    console.error('❌ File upload error:', error.message)
    return null
  }
}


/**
 * Check if analysis job was automatically created by trigger
 */
async function checkAnalysisJobCreated(recording) {
  await initializeSmokeTest()

  try {
    console.log(`🔍 Checking if analysis job was automatically created...`)

    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('id, status, created_at')
      .eq('video_recording_id', recording.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No analysis job found (trigger may not have fired yet)')
        return null
      }
      console.error('❌ Error checking analysis job:', error.message)
      return null
    }

    console.log(`✅ Analysis job automatically created: ID ${data.id} (status: ${data.status})`)
    return data

  } catch (error) {
    console.error('❌ Error checking analysis job:', error.message)
    return null
  }
}


async function main() {
  console.log('📤📊 Extended Smoke Test: Video Upload with Database Record\n')

  let videoRecord = null
  let storagePath = null

  try {
    // 1. Create video recording record first (with pending status)
    const recordingData = await createVideoRecordingRecord()
    if (!recordingData) {
      console.log('❌ DATABASE RECORD CREATION FAILED')
      process.exit(1)
    }

    videoRecord = recordingData.recording
    storagePath = recordingData.storagePath

    // 2. Upload file to storage (temp → final path → status update)
    const uploadResult = await uploadVideoToStorage(recordingData)
    if (!uploadResult) {
      console.log('❌ VIDEO UPLOAD FAILED')
      process.exit(1)
    }

    // 3. Check if analysis job was automatically created by trigger
    const analysisJob = await checkAnalysisJobCreated(videoRecord)

    console.log('\n🎯 Extended Upload Smoke Test Results:')
    console.log('✅ PASSED: Database record creation')
    console.log('✅ PASSED: Video upload to temp path')
    console.log('✅ PASSED: File moved to final user-scoped path')
    console.log('✅ PASSED: Database record status updated to completed')
    console.log(`   Storage path: ${storagePath}`)
    console.log(`   Database ID: ${videoRecord.id}`)
    if (analysisJob) {
      console.log(`   Analysis job: ID ${analysisJob.id} (status: ${analysisJob.status})`)
    }

  } catch (error) {
    console.error('\n❌ Extended upload smoke test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Extended upload smoke test completed successfully!')
}

// Export for orchestrator
export { createVideoRecordingRecord, uploadVideoToStorage }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
