#!/usr/bin/env node

/**
 * Smoke Test: Analysis Invocation
 * Tests calling ai-analyze-video edge function with storage path
 */

import { createSmokeServiceClient, loadSmokeEnv } from './smoke-utils.mjs'

// Global variables for invokeAnalysis function
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

async function invokeAnalysis(videoPath, userId) {
  await initializeSmokeTest()

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
