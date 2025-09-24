#!/usr/bin/env node

/**
 * Smoke Test: Analysis Invocation
 * Tests calling ai-analyze-video edge function with storage path
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

async function invokeAnalysis(videoPath, userId) {
  console.log(`🚀 Invoking analysis for: ${videoPath}`)

  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze-video', {
      body: {
        videoPath,
        userId,
        videoSource: 'uploaded_video',
        runVideoAnalysis: true,
        runLLMFeedback: true,
        runSSML: true,
        runTTS: true,
      }
    })

    if (error) {
      console.error('❌ Edge function error:', error)
      return null
    }

    if (!data || !data.analysisId) {
      console.error('❌ No analysis ID returned:', data)
      return null
    }

    console.log(`✅ Analysis invoked with ID: ${data.analysisId}`)
    return data.analysisId
  } catch (error) {
    console.error('❌ Analysis invocation error:', error.message)
    return null
  }
}

async function main() {
  console.log('🎬 Smoke Test: Analysis Invocation\n')

  const videoPath = process.argv[2]
  const userId = process.argv[3] || '550e8400-e29b-41d4-a716-446655440000'

  if (!videoPath) {
    console.error('❌ Video path required: node smoke-analysis.mjs <video-path> [user-id]')
    process.exit(1)
  }

  try {
    const analysisId = await invokeAnalysis(videoPath, userId)
    if (!analysisId) {
      console.log('❌ ANALYSIS SMOKE TEST FAILED')
      process.exit(1)
    }

    console.log('\n🎯 Analysis Invocation Smoke Test Results:')
    console.log('✅ PASSED: ai-analyze-video edge function invocation working')
    console.log(`   Analysis ID: ${analysisId}`)
    console.log(`   Video path: ${videoPath}`)

  } catch (error) {
    console.error('\n❌ Analysis smoke test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Analysis invocation smoke test completed successfully!')
}

// Export for orchestrator
export { invokeAnalysis }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
