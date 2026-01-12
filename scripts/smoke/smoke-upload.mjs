#!/usr/bin/env node

/**
 * Smoke Test: Video Upload
 * Tests video upload to Supabase raw bucket
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getScriptConfig } from '../utils/env.mjs'
import { createSmokeServiceClient, loadSmokeEnv } from './smoke-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

// Load and validate environment configuration
const config = getScriptConfig()

// Global variables for shared functions
let supabase = null

async function initializeSmokeTest() {
  if (!supabase) {
    // Load environment variables
    loadSmokeEnv()

    // Create Supabase client
    supabase = await createSmokeServiceClient()
  }
  return supabase
}


async function uploadTestVideo(testUser, fileName) {
  await initializeSmokeTest()

  const videoPath = join(projectRoot, 'test-assets', 'videos', 'mini_speech.mp4')

  try {
    const videoBuffer = readFileSync(videoPath)
    console.log(`📁 Found test video: ${videoPath} (${videoBuffer.length} bytes)`)

    // If called from orchestrator without args, fetch test user
    const wasCalledWithoutArgs = testUser === undefined
    if (wasCalledWithoutArgs) {
      const { data: users, error: userError } = await supabase.auth.admin.listUsers()
      if (userError) {
        console.error('❌ Error getting test user:', userError.message)
        return null
      }

      const testUserEmail = config.testAuth?.email || 'smoke-test@example.com'
      testUser = users.users.find(user => user.email === testUserEmail)
      if (!testUser) {
        console.error('❌ Test user not found')
        return null
      }

      fileName = `smoke-upload-${Date.now()}.mp4`
    }

    const storagePath = `${testUser.id}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('raw')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return null
    }

    console.log(`✅ Uploaded to: ${storagePath}`)
    
    // When called from orchestrator (no args), return just storage path string
    // When called from main (with args), return full object
    if (wasCalledWithoutArgs) {
      return storagePath
    }
    
    return {
      fileName,
      storagePath,
      videoBuffer,
      uploadData
    }
  } catch (error) {
    console.error('❌ File read/upload error:', error.message)
    return null
  }
}

async function main() {
  console.log('📤 Smoke Test: Video Upload\n')

  try {
    // Get test user for upload
    const supabase = await initializeSmokeTest()
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      console.error('❌ Error getting test user:', userError.message)
      process.exit(1)
    }

    const testUser = users.users.find(user => user.email === config.testAuth.email)
    if (!testUser) {
      console.error('❌ Test user not found')
      process.exit(1)
    }

    const fileName = `smoke-upload-${Date.now()}.mp4`

    const uploadResult = await uploadTestVideo(testUser, fileName)
    if (!uploadResult) {
      console.log('❌ UPLOAD SMOKE TEST FAILED')
      process.exit(1)
    }

    console.log('\n🎯 Upload Smoke Test Results:')
    console.log('✅ PASSED: Video upload to raw bucket working')
    console.log(`   Storage path: ${uploadResult.storagePath}`)

  } catch (error) {
    console.error('\n❌ Upload smoke test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Upload smoke test completed successfully!')
}

// Export for orchestrator
export { uploadTestVideo }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
