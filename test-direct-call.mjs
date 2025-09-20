#!/usr/bin/env node

/**
 * Direct test of the AI analysis function
 */

async function testDirectCall() {
  console.log('🧪 Testing direct AI analysis call...')
  
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoPath: 'videos/test-1758303541112.mp4',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        videoSource: 'uploaded_video'
      })
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    const result = await response.json()
    console.log(`📡 Response:`, JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testDirectCall()
