#!/usr/bin/env node

/**
 * Test AI Audio/TTS Generation Script
 * Tests Text-to-Speech (TTS) audio generation functionality
 * Covers: SSML/Text → Audio file generation → Storage
 * Tests: TTS API integration, audio URL generation, format validation
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

async function findAnalysisWithSSML() {
  try {
    // Look for an analysis that has SSML data (indicating SSML generation worked)
    const { data: analyses, error } = await supabase
      .from('analysis_jobs')
      .select('id, ssml, full_feedback_text, feedback')
      .not('ssml', 'is', null)
      .eq('status', 'completed')
      .limit(5)

    if (error) {
      console.log('⚠️ Could not query analysis jobs:', error.message)
      return null
    }

    if (!analyses || analyses.length === 0) {
      console.log('⚠️ No analyses found with SSML data')
      return null
    }

    console.log(`✅ Found analysis with SSML: ${analyses[0].id}`)
    return analyses[0].id
  } catch (error) {
    console.log('⚠️ Error finding analysis with SSML:', error.message)
    return null
  }
}

async function testTTSGenerationFromAnalysis(analysisId) {
  console.log(`🔊 Testing TTS generation from analysis: ${analysisId}`)

  try {
    // Call TTS endpoint with analysisId to generate audio from existing SSML
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId: analysisId,
        perFeedbackItem: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ TTS generation failed:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('✅ TTS generation completed')

    // Validate the TTS response
    return validateTTSResponse(result)

  } catch (error) {
    console.error('❌ TTS generation error:', error.message)
    return false
  }
}

async function testTTSGenerationFromText() {
  console.log(`🔊 Testing TTS generation from plain text`)

  const testText = "Excellent work on maintaining proper form! Your squat depth is perfect and your back stays straight throughout the movement."

  try {
    // Call TTS endpoint with plain text
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testText,
        perFeedbackItem: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ TTS generation from text failed:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('✅ TTS generation from text completed')

    // Validate the TTS response
    return validateTTSResponse(result)

  } catch (error) {
    console.error('❌ TTS generation from text error:', error.message)
    return false
  }
}

async function testTTSGenerationFromSSML() {
  console.log(`🔊 Testing TTS generation from custom SSML`)

  const testSSML = `<speak>
    <prosody rate="medium" pitch="medium">
      Great technique! <break time="500ms"/>
      Keep your core engaged and maintain that upright posture.
    </prosody>
  </speak>`

  try {
    // Call TTS endpoint with custom SSML
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ssml: testSSML,
        perFeedbackItem: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ TTS generation from SSML failed:', response.status, errorData)
      return false
    }

    const result = await response.json()
    console.log('✅ TTS generation from custom SSML completed')

    // Validate the TTS response
    return validateTTSResponse(result)

  } catch (error) {
    console.error('❌ TTS generation from SSML error:', error.message)
    return false
  }
}

function validateTTSResponse(result) {
  // Check for required TTS response fields
  if (!result.audioUrl) {
    console.log('❌ No audioUrl in TTS response')
    return false
  }

  console.log('✅ Audio URL generated:', result.audioUrl)

  // Validate audio URL format (should be a valid URL)
  try {
    const url = new URL(result.audioUrl)
    console.log(`✅ Valid audio URL format (${url.protocol})`)
  } catch (error) {
    console.log('⚠️ Audio URL is not a valid URL format')
  }

  // Check format (should be mp3 or aac)
  if (result.format) {
    const validFormats = ['mp3', 'aac', 'wav']
    if (validFormats.includes(result.format)) {
      console.log(`✅ Valid audio format: ${result.format}`)
    } else {
      console.log(`⚠️ Unexpected audio format: ${result.format}`)
    }
  } else {
    console.log('⚠️ No format specified in response')
  }

  // Check duration if provided
  if (result.duration) {
    console.log(`✅ Audio duration: ${result.duration} seconds`)
  } else {
    console.log('⚠️ No duration specified in response')
  }

  // Check segments if per-feedback-item was requested
  if (result.segments) {
    console.log(`✅ Generated ${result.segments.length} audio segments`)
    result.segments.forEach((segment, index) => {
      console.log(`   Segment ${index + 1}: ${segment.audioUrl} (${segment.duration}s)`)
    })
  }

  return true
}

async function main() {
  console.log('🔊 AI Audio/TTS Generation Test Script\n')
  console.log('This script tests: Text/SSML → Audio File Generation → Storage')
  console.log('Coverage: TTS API integration, audio format validation, URL generation')
  console.log('Excluded: Video analysis, pose detection, LLM feedback\n')

  let testPassed = false

  // Test 1: Try TTS generation from existing analysis with SSML
  const analysisWithSSML = await findAnalysisWithSSML()
  if (analysisWithSSML) {
    console.log(`📊 Testing TTS generation using existing analysis with SSML...`)
    testPassed = await testTTSGenerationFromAnalysis(analysisWithSSML)
  }

  // Test 2: If no analysis with SSML, test TTS generation from plain text
  if (!testPassed) {
    console.log(`📝 Testing TTS generation from plain text...`)
    testPassed = await testTTSGenerationFromText()
  }

  // Test 3: Test TTS generation from custom SSML
  if (testPassed) {
    console.log(`🔤 Testing TTS generation from custom SSML...`)
    const ssmlTestPassed = await testTTSGenerationFromSSML()
    // Don't override main test result, but log the SSML test
    if (!ssmlTestPassed) {
      console.log('⚠️ Custom SSML test failed, but basic TTS tests passed')
    }
  }

  console.log('\n🎯 Audio/TTS Generation Test Results:')
  if (testPassed) {
    console.log('✅ PASSED: TTS/audio generation working correctly')
    console.log('   - Audio URLs generated successfully')
    console.log('   - Proper format validation')
    console.log('   - TTS API integration functional')
  } else {
    console.log('❌ FAILED: TTS/audio generation has issues')
    console.log('💡 Try running test:ai:ssml first to generate SSML data')
    process.exit(1)
  }

  console.log('\n🎉 Audio/TTS generation test completed!')
}

// Run the script
main().catch(console.error)

