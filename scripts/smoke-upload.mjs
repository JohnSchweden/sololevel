#!/usr/bin/env node

/**
 * Smoke Test: Video Upload
 * Tests video upload to Supabase raw bucket
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env')
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key] = value
        }
      }
    }
    console.log('✅ Loaded environment variables from .env')
  } catch (error) {
    console.log('⚠️  No .env file found, using existing environment variables')
  }
}

// Load .env file
loadEnv()

// Supabase local configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  }
})

async function ensureRawBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const rawBucket = buckets?.find(b => b.name === 'raw')

    if (!rawBucket) {
      console.log('📦 Creating raw bucket...')
      const { error } = await supabase.storage.createBucket('raw', {
        public: false,
        allowedMimeTypes: ['video/mp4', 'video/quicktime'],
        fileSizeLimit: 524288000 // 500MB
      })

      if (error) {
        console.log('⚠️ Could not create raw bucket:', error.message)
      } else {
        console.log('✅ Created raw bucket')
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check/create raw bucket:', error.message)
  }
}

async function uploadTestVideo() {
  const videoPath = join(projectRoot, 'test-assets', 'videos', 'mini_speech.mp4')

  try {
    const videoBuffer = readFileSync(videoPath)
    console.log(`📁 Found test video: ${videoPath} (${videoBuffer.length} bytes)`)

    const fileName = `smoke-upload-${Date.now()}.mp4`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('raw')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return null
    }

    console.log(`✅ Uploaded to: raw/${fileName}`)
    return `raw/${fileName}`
  } catch (error) {
    console.error('❌ File read/upload error:', error.message)
    return null
  }
}

async function main() {
  console.log('📤 Smoke Test: Video Upload\n')

  try {
    await ensureRawBucket()

    const videoStoragePath = await uploadTestVideo()
    if (!videoStoragePath) {
      console.log('❌ UPLOAD SMOKE TEST FAILED')
      process.exit(1)
    }

    console.log('\n🎯 Upload Smoke Test Results:')
    console.log('✅ PASSED: Video upload to raw bucket working')
    console.log(`   Storage path: ${videoStoragePath}`)

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
