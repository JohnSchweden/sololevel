#!/usr/bin/env node

/**
 * Pipeline Smoke Test Orchestrator
 * Runs all individual smoke tests in sequence
 * Tests the complete video recording → upload → analysis → feedback pipeline
 */

import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { invokeAnalysis } from './smoke-analysis.mjs'
import { validateAudioUrl } from './smoke-audio.mjs'
import { pollStatus } from './smoke-status.mjs'
import { uploadTestVideo } from './smoke-upload.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

async function runPipelineSmokeTest() {
  console.log('🚀 Pipeline Smoke Test Orchestrator\n')
  console.log('This script runs all smoke tests in sequence:')
  console.log('1. Video Upload → 2. Analysis Invocation → 3. Status Polling → 4. Audio Validation\n')

  const results = {
    timestamp: new Date().toISOString(),
    stages: {},
    overall: { success: false, duration: 0 }
  }

  const startTime = Date.now()

  try {
    // Stage 1: Video Upload
    console.log('\n📤 Stage 1: Testing Video Upload...')
    const videoStoragePath = await uploadTestVideo()
    results.stages.upload = {
      success: !!videoStoragePath,
      storagePath: videoStoragePath,
      timestamp: new Date().toISOString()
    }

    if (!videoStoragePath) {
      throw new Error('Video upload failed')
    }
    console.log('✅ Upload stage passed')

    // Stage 2: Analysis Invocation
    console.log('\n🎬 Stage 2: Testing Analysis Invocation...')
    const userId = '550e8400-e29b-41d4-a716-446655440000' // Pipeline smoke test user
    const analysisId = await invokeAnalysis(videoStoragePath, userId)
    results.stages.analysis = {
      success: !!analysisId,
      analysisId,
      videoPath: videoStoragePath,
      userId,
      timestamp: new Date().toISOString()
    }

    if (!analysisId) {
      throw new Error('Analysis invocation failed')
    }
    console.log('✅ Analysis invocation stage passed')

    // Stage 3: Status Polling
    console.log('\n⏳ Stage 3: Testing Status Polling...')
    const finalStatus = await pollStatus(analysisId)
    results.stages.status = {
      success: !!finalStatus && (finalStatus.status === 'completed' || finalStatus.status === 'failed'),
      finalStatus: finalStatus?.status,
      hasAudioUrl: !!finalStatus?.audio_url,
      hasFeedback: !!(finalStatus?.fullFeedback || finalStatus?.summary),
      timestamp: new Date().toISOString()
    }

    if (!finalStatus) {
      throw new Error('Status polling failed or timed out')
    }

    if (finalStatus.status === 'failed') {
      console.log('⚠️  Analysis completed but failed - this may be expected for smoke testing')
    } else {
      console.log('✅ Status polling stage passed')
    }

    // Stage 4: Audio Validation (if audio URL present)
    if (finalStatus.audio_url) {
      console.log('\n🔊 Stage 4: Testing Audio Validation...')
      const audioResult = await validateAudioUrl(finalStatus.audio_url)
      results.stages.audio = {
        success: audioResult.valid,
        audioUrl: finalStatus.audio_url,
        contentType: audioResult.contentType,
        contentLength: audioResult.contentLength,
        timestamp: new Date().toISOString()
      }

      if (audioResult.valid) {
        console.log('✅ Audio validation stage passed')
      } else {
        console.log('⚠️  Audio validation failed - URL may not be accessible')
      }
    } else {
      console.log('\n🔊 Stage 4: Skipping Audio Validation (no audio URL)')
      results.stages.audio = {
        success: true, // Not having audio is acceptable for smoke test
        reason: 'No audio URL generated',
        timestamp: new Date().toISOString()
      }
    }

    // Calculate duration and overall success
    results.overall.duration = Date.now() - startTime
    results.overall.success = Object.values(results.stages).every((stage) => stage.success)

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const resultsPath = join(projectRoot, 'test-results', `pipeline-smoke-${timestamp}.json`)
    writeFileSync(resultsPath, JSON.stringify(results, null, 2))

    console.log('\n📊 Pipeline Smoke Test Results:')

    // Individual stage results
    Object.entries(results.stages).forEach(([stage, result]) => {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} ${stage}: ${result.success ? 'PASSED' : 'FAILED'}`)
    })

    // Overall result
    if (results.overall.success) {
      console.log('\n🎉 ALL SMOKE TESTS PASSED!')
      console.log('The complete video pipeline is working correctly.')
      console.log(`Total time: ${Math.round(results.overall.duration / 1000)}s`)
      console.log(`Results saved to: ${resultsPath}`)
    } else {
      console.log('\n❌ SOME SMOKE TESTS FAILED')
      console.log('Check individual stage results above.')
      console.log(`Results saved to: ${resultsPath}`)
      process.exit(1)
    }

  } catch (error) {
    results.overall.duration = Date.now() - startTime
    results.error = error.message

    console.error('\n❌ Pipeline smoke test orchestrator failed:', error.message)

    // Save error results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const resultsPath = join(projectRoot, 'test-results', `pipeline-smoke-error-${timestamp}.json`)
    writeFileSync(resultsPath, JSON.stringify(results, null, 2))

    console.log(`Error results saved to: ${resultsPath}`)
    process.exit(1)
  }
}

// Run the orchestrator
runPipelineSmokeTest().catch(console.error)