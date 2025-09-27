#!/usr/bin/env node

/**
 * Smoke Test: Status Polling
 * Tests polling /status?id=<id> until completed/failed
 */

import { getSupabaseUrl, loadSmokeEnv } from './smoke-utils.mjs'

// Load environment variables
loadSmokeEnv()

const supabaseUrl = getSupabaseUrl()

async function pollStatus(analysisId, maxAttempts = 30) { // 1 minute max
  console.log(`⏳ Polling status for analysis: ${analysisId}`)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-analyze-video/status?id=${analysisId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Status check failed:', response.status, data)
        return null
      }

      console.log(`📈 Status: ${data.status} (${data.progress || 0}%) - Attempt ${attempt}/${maxAttempts}`)

      if (data.status === 'completed') {
        console.log('✅ Analysis completed!')
        return data
      }

      if (data.status === 'failed') {
        console.log('❌ Analysis failed:', data.error)
        return data
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('❌ Polling error:', error.message)
      return null
    }
  }

  console.log('⏰ Analysis still processing after maximum attempts')
  return null
}

async function main() {
  console.log('📊 Smoke Test: Status Polling\n')

  const analysisId = process.argv[2]

  if (!analysisId) {
    console.error('❌ Analysis ID required: node smoke-status.mjs <analysis-id>')
    process.exit(1)
  }

  try {
    const finalStatus = await pollStatus(analysisId)
    if (!finalStatus) {
      console.log('❌ STATUS SMOKE TEST FAILED - polling timeout or error')
      process.exit(1)
    }

    console.log('\n🎯 Status Polling Smoke Test Results:')
    if (finalStatus.status === 'completed') {
      console.log('✅ PASSED: Status polling working, analysis completed')
      console.log('   - Status endpoint responding')
      console.log('   - Progress tracking working')
      console.log('   - Completion detection working')
    } else if (finalStatus.status === 'failed') {
      console.log('⚠️  PASSED: Status polling working, but analysis failed')
      console.log('   - Status endpoint responding')
      console.log('   - Error reporting working')
      console.log(`   - Error: ${finalStatus.error}`)
    } else {
      console.log('❌ FAILED: Unexpected final status')
      console.log(`   Final status: ${finalStatus.status}`)
      process.exit(1)
    }

    // Log key status fields
    console.log('\n📋 Status Response Summary:')
    console.log(`   Status: ${finalStatus.status}`)
    console.log(`   Progress: ${finalStatus.progress || 0}%`)
    console.log(`   Has Audio URL: ${!!finalStatus.audio_url}`)
    console.log(`   Has Feedback: ${!!finalStatus.fullFeedback || !!finalStatus.summary}`)

  } catch (error) {
    console.error('\n❌ Status smoke test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Status polling smoke test completed!')
}

// Export for orchestrator
export { pollStatus }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
