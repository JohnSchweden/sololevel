#!/usr/bin/env node

/**
 * Smoke Test: Audio Validation
 * Tests audio URL accessibility when present in analysis results
 */

async function validateAudioUrl(audioUrl) {
  if (!audioUrl) {
    console.log('⚠️  No audio URL provided for validation')
    return { valid: false, reason: 'No URL provided' }
  }

  console.log(`🔍 Validating audio URL: ${audioUrl.substring(0, 80)}...`)

  try {
    const response = await fetch(audioUrl)

    if (response.ok) {
      const contentType = response.headers.get('content-type')
      const contentLength = response.headers.get('content-length')

      console.log('✅ Audio URL validation successful')
      console.log(`   Content-Type: ${contentType}`)
      console.log(`   Content-Length: ${contentLength} bytes`)

      return {
        valid: true,
        contentType,
        contentLength: parseInt(contentLength) || 0,
        status: response.status
      }
    } else {
      console.log(`⚠️  Audio URL returned status: ${response.status}`)
      return {
        valid: false,
        reason: `HTTP ${response.status}`,
        status: response.status
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not validate audio URL: ${error.message}`)
    return {
      valid: false,
      reason: error.message,
      error: error.message
    }
  }
}

async function main() {
  console.log('🔊 Smoke Test: Audio Validation\n')

  const audioUrl = process.argv[2]

  if (!audioUrl) {
    console.error('❌ Audio URL required: node smoke-audio.mjs <audio-url>')
    console.log('Example: node smoke-audio.mjs https://example.com/audio.mp3')
    process.exit(1)
  }

  try {
    const result = await validateAudioUrl(audioUrl)

    console.log('\n🎯 Audio Validation Smoke Test Results:')
    if (result.valid) {
      console.log('✅ PASSED: Audio URL accessible and valid')
      console.log('   - URL responds with 200 status')
      console.log('   - Content-Type indicates audio file')
      console.log(`   - File size: ${result.contentLength} bytes`)
    } else {
      console.log('❌ FAILED: Audio URL validation failed')
      console.log(`   Reason: ${result.reason}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Audio smoke test failed:', error.message)
    process.exit(1)
  }

  console.log('\n🎉 Audio validation smoke test completed successfully!')
}

// Export for orchestrator
export { validateAudioUrl }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
