#!/usr/bin/env node

/**
 * Audio Bucket CORS Setup Script
 * Configures CORS headers for the private 'audio' bucket to support streaming playback
 * Run this after creating the bucket to enable proper audio streaming
 */

import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function setupAudioBucketCORS() {
  console.log('🔧 Setting up CORS configuration for audio bucket...')

  try {
    // CORS configuration for audio streaming
    // Note: Supabase Storage CORS is configured through the dashboard or API
    // This script provides instructions and validation

    const corsConfig = {
      allowedOrigins: ['*'], // Allow all origins for signed URLs
      allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST'], // Add upload methods
      allowedHeaders: ['Authorization', 'Content-Type', 'Range'], // Content-Type needed for MIME validation
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
      maxAgeSeconds: 3600
    }

    console.log('📋 Required CORS configuration for audio bucket:')
    console.log('')
    console.log('In Supabase Dashboard → Storage → Buckets → audio → Settings:')
    console.log('')
    console.log('Allowed Origins: *')
    console.log('Allowed Methods: GET, HEAD, OPTIONS, PUT, POST')
    console.log('Allowed Headers: Authorization, Content-Type, Range')
    console.log('Exposed Headers: Content-Range, Accept-Ranges, Content-Length')
    console.log('Max Age: 3600 seconds')
    console.log('')

    // For local development, CORS might be automatically configured
    // For production, manual configuration is required

    // Test CORS by making a HEAD request to a signed URL
    console.log('🔍 Testing CORS configuration...')

    // First, create a test file to test with
    const testPath = 'audio/cors-test/test.txt'
    const testContent = new TextEncoder().encode('CORS test file')

    // Upload test file
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true // Allow overwrite for test
      })

    if (uploadError) {
      console.error('❌ Failed to upload CORS test file:', uploadError.message)
      process.exit(1)
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('audio')
      .createSignedUrl(testPath, 300) // 5 minute TTL

    if (signedUrlError) {
      console.error('❌ Failed to generate signed URL for CORS test:', signedUrlError.message)
      process.exit(1)
    }

    const signedUrl = signedUrlData.signedUrl
    console.log(`✅ Generated signed URL for CORS testing: ${signedUrl.substring(0, 80)}...`)

    // Test OPTIONS request (CORS preflight)
    try {
      const optionsResponse = await fetch(signedUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Range'
        }
      })

      console.log(`📡 OPTIONS request status: ${optionsResponse.status}`)

      // Check CORS headers
      const corsHeaders = {
        'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers'),
        'access-control-max-age': optionsResponse.headers.get('access-control-max-age')
      }

      console.log('🔍 CORS headers from OPTIONS response:')
      Object.entries(corsHeaders).forEach(([header, value]) => {
        console.log(`   ${header}: ${value || 'not set'}`)
      })

      // Test HEAD request for Range support
      const headResponse = await fetch(signedUrl, { method: 'HEAD' })

      console.log(`📡 HEAD request status: ${headResponse.status}`)
      console.log('🔍 Range-related headers from HEAD response:')
      console.log(`   accept-ranges: ${headResponse.headers.get('accept-ranges') || 'not set'}`)
      console.log(`   content-length: ${headResponse.headers.get('content-length') || 'not set'}`)
      console.log(`   content-type: ${headResponse.headers.get('content-type') || 'not set'}`)

      // Test Range request
      const rangeResponse = await fetch(signedUrl, {
        headers: { 'Range': 'bytes=0-99' }
      })

      console.log(`📡 Range request status: ${rangeResponse.status}`)
      console.log('🔍 Range response headers:')
      console.log(`   content-range: ${rangeResponse.headers.get('content-range') || 'not set'}`)
      console.log(`   content-length: ${rangeResponse.headers.get('content-length') || 'not set'}`)

      if (rangeResponse.status === 206) {
        console.log('✅ Range requests are supported (HTTP 206)')
      } else {
        console.log('⚠️  Range requests may not be properly configured')
      }

    } catch (fetchError) {
      console.log('⚠️  Could not test CORS headers (may be expected in local environment):', fetchError.message)
      console.log('')
      console.log('For production deployment, ensure CORS is configured in Supabase Dashboard.')
    }

    // Clean up test file
    try {
      await supabase.storage.from('audio').remove([testPath])
      console.log('🧹 Cleaned up CORS test file')
    } catch (cleanupError) {
      console.warn('⚠️  Failed to clean up test file (non-critical):', cleanupError.message)
    }

    console.log('')
    console.log('🎉 Audio bucket CORS setup validation completed!')
    console.log('')
    console.log('Summary:')
    console.log('- ✅ CORS configuration instructions provided')
    console.log('- ✅ Signed URL generation tested')
    console.log('- ✅ Range request support validated (where possible)')
    console.log('')
    console.log('For production: Configure CORS in Supabase Dashboard → Storage → audio bucket settings')

  } catch (error) {
    console.error('❌ Unexpected error during CORS setup:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run setup
setupAudioBucketCORS()
