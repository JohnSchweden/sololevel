#!/usr/bin/env node

/**
 * Simple test to check if Edge Function is accessible
 */

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function accessibility...')
  
  try {
    // Test basic connectivity
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test'
      })
    })
    
    console.log(`📡 Response status: ${response.status}`)
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log(`📡 Response body:`, text)
    
  } catch (error) {
    console.error('❌ Error testing Edge Function:', error.message)
  }
}

testEdgeFunction()
