#!/usr/bin/env node

/**
 * Test environment variables
 */

async function testEnv() {
  console.log('🧪 Testing environment variables...')
  
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video/test-env', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    const result = await response.text()
    console.log(`📡 Response:`, result)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testEnv()
