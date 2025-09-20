#!/usr/bin/env node

/**
 * Test AI Function Script
 * Uploads a test video to local Supabase Storage and runs analysis
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
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  console.log('Add it to your .env file:')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
  console.log('')
  console.log('Or set it manually:')
  console.log('export SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureVideosBucket() {
  try {
    // Check if videos bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const videosBucket = buckets?.find(b => b.name === 'videos')

    if (!videosBucket) {
      console.log('📦 Creating videos bucket...')
      const { error } = await supabase.storage.createBucket('videos', {
        public: false,
        allowedMimeTypes: ['video/mp4', 'video/mov', 'video/avi'],
        fileSizeLimit: 104857600 // 100MB
      })

      if (error) {
        console.log('⚠️ Could not create videos bucket:', error.message)
        console.log('Continuing anyway - bucket might already exist')
      } else {
        console.log('✅ Created videos bucket')
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check/create videos bucket:', error.message)
  }
}

async function uploadTestVideo() {
  const videoPath = join(projectRoot, 'test-assets/videos/mini_speech.mp4')

  try {
    // Check if file exists
    const videoBuffer = readFileSync(videoPath)
    console.log(`📁 Found test video: ${videoPath} (${videoBuffer.length} bytes)`)

    // Upload to Supabase Storage
    const fileName = `test-${Date.now()}.mp4`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message)
      return null
    }

    console.log(`✅ Uploaded to: videos/${fileName}`)
    return `videos/${fileName}`
  } catch (error) {
    console.error('❌ File read/upload error:', error.message)
    return null
  }
}

async function runAnalysis(videoPath, userId) {
  console.log(`🚀 Starting AI analysis for: ${videoPath}`)

  try {
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('ai-analyze-video', {
      body: {
        videoPath,
        userId,
        videoSource: 'uploaded_video'
      }
    })

    if (error) {
      console.error('❌ Function call failed:', error.message)
      return null
    }

    console.log('✅ Analysis job created:', data)
    return data.analysisId
  } catch (error) {
    console.error('❌ Analysis error:', error.message)
    return null
  }
}

async function pollStatus(analysisId, maxAttempts = 60) {
  console.log(`📊 Polling status for analysis: ${analysisId}`)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:54321/functions/v1/ai-analyze-video/status?id=${analysisId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Status check failed:', response.status, data)
        return
      }

      console.log(`📈 Status: ${data.status} (${data.progress}%)`)

      if (data.status === 'completed') {
        console.log('✅ Analysis completed!')
        console.log('📝 Results:', data.results)
        console.log('🎵 Audio URL:', data.audioUrl)
        return
      }

      if (data.status === 'failed') {
        console.log('❌ Analysis failed:', data.error)
        return
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('❌ Polling error:', error.message)
      return
    }
  }

  console.log('⏰ Analysis still processing after maximum attempts')
}

async function main() {
  console.log('🎬 AI Function Test Script\n')

  // Ensure videos bucket exists
  await ensureVideosBucket()

  // Get user ID (ensure test user exists)
  let userId = process.argv[2]
  if (!userId) {
    // For local testing, use a mock UUID
    userId = '550e8400-e29b-41d4-a716-446655440000'

    // Try to create a profile for the test user (optional)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          username: 'test-user',
          full_name: 'Test User',
          bio: 'AI Function Test User'
        }, { onConflict: 'user_id' })

      if (profileError) {
        console.log('⚠️ Could not create test user profile:', profileError.message)
        console.log('This is ok - continuing with test')
      }
    } catch (error) {
      console.log('⚠️ Could not create test user profile:', error.message)
      console.log('This is ok - continuing with test')
    }

    console.log(`👤 Using test user: ${userId}`)
  }

  // Upload test video
  const videoStoragePath = await uploadTestVideo()
  if (!videoStoragePath) {
    console.log('❌ No video uploaded, exiting')
    return
  }

  // Run analysis
  const analysisId = await runAnalysis(videoStoragePath, userId)
  if (!analysisId) {
    console.log('❌ Analysis not started, exiting')
    return
  }

  // Poll for completion
  await pollStatus(analysisId)

  console.log('\n🎉 Test completed!')
}

// Run the script
main().catch(console.error)
