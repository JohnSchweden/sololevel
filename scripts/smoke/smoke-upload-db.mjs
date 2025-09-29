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
      duration_seconds: 6.3, // Test video is approximately 30 seconds
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

    // Create authenticated client (not service role) to create signed URL
    const supabase = await createSmokeAnonClient()

    // Authenticate as test user to create signed URL
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: config.testAuth.email,
      password: config.testAuth.password
    })
    if (signInError) {
      console.error('❌ Authentication failed for signed URL creation:', signInError.message)
      return null
    }

    console.log(`🔗 Creating signed URL for path: ${recordingData.storagePath}`)

    // Create signed URL for the exact storage path
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('raw')
      .createSignedUploadUrl(recordingData.storagePath, {
        upsert: false
      })

    if (signedUrlError) {
      console.error('❌ Signed URL creation failed:', signedUrlError.message)
      return null
    }

    console.log(`📤 Uploading directly to signed URL...`)

    // Upload directly to signed URL using fetch (same as videoUploadService)
    const response = await fetch(signedUrlData.signedUrl, {
      method: 'PUT',
      body: recordingData.videoBuffer,
      headers: {
        'Content-Type': 'video/mp4',
      },
    })

    if (!response.ok) {
      console.error(`❌ Upload failed with status: ${response.status}`)
      return null
    }

    console.log(`✅ Successfully uploaded to: ${recordingData.storagePath}`)
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

    // 2. Upload file to storage
    const uploadResult = await uploadVideoToStorage(recordingData)
    if (!uploadResult) {
      console.log('❌ VIDEO UPLOAD FAILED')
      process.exit(1)
    }

    // 3. Check if analysis job was automatically created by trigger
    const analysisJob = await checkAnalysisJobCreated(videoRecord)

    console.log('\n🎯 Extended Upload Smoke Test Results:')
    console.log('✅ PASSED: Database record creation (pending status)')
    console.log('✅ PASSED: Video upload to raw bucket')
    console.log(`   Storage path: ${storagePath}`)
    console.log(`   Database ID: ${videoRecord.id}`)
    console.log(`   Status: ${videoRecord.upload_status} (${videoRecord.upload_progress}%)`)
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
