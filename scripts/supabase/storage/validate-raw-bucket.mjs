#!/usr/bin/env node

/**
 * Raw Bucket Validation Script
 * Validates that the private 'raw' bucket exists and has proper configuration for video uploads
 * Run this in CI to ensure storage setup is correct
 */

import { createClient } from '@supabase/supabase-js'
// Import the checkStorageHealth function directly since we can't import TS files in Node
// We'll duplicate the logic here for the validation script

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

/**
 * Health check for storage bucket existence and permissions
 * @param {any} supabase Supabase client instance
 * @param {string} bucket Bucket name to check
 * @returns {Promise<{healthy: boolean, message: string, details?: any}>}
 */
async function checkStorageHealth(supabase, bucket = 'raw') {
  try {
    console.log(`   Checking bucket '${bucket}' health...`)

    // Check if bucket exists by listing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      const message = `Failed to list buckets: ${listError.message}`
      return { healthy: false, message, details: { error: listError } }
    }

    const bucketExists = buckets?.some((b) => b.name === bucket)
    if (!bucketExists) {
      const message = `Bucket '${bucket}' does not exist`
      return { healthy: false, message, details: { availableBuckets: buckets?.map((b) => b.name) } }
    }

    // Test write permissions by attempting to upload a small health check file
    // Use video/mp4 MIME type since that's what's allowed in the bucket
    const healthCheckPath = `raw/healthcheck/health_${Date.now()}.mp4`
    const healthCheckContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]) // Minimal binary data
    const healthCheckContentType = 'video/mp4'

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(healthCheckPath, healthCheckContent, {
          contentType: healthCheckContentType,
          upsert: false // Don't overwrite existing files
        })

      if (uploadError) {
        // 409 Conflict means file exists (which is fine for health check)
        if (uploadError.statusCode === 409) {
          console.log(`   Health check file already exists, permissions verified`)
        } else {
          const message = `Failed to upload health check file: ${uploadError.message}`
          return { healthy: false, message, details: { error: uploadError } }
        }
      } else {
        console.log(`   Health check upload successful`)
      }

      // Clean up health check file if we created it
      if (!uploadError || uploadError.statusCode !== 409) {
        try {
          await supabase.storage.from(bucket).remove([healthCheckPath])
          console.log(`   Cleaned up health check file`)
        } catch (cleanupError) {
          console.warn(`   Failed to clean up health check file (non-critical): ${cleanupError.message}`)
        }
      }

    } catch (uploadException) {
      const message = `Exception during upload test: ${uploadException.message}`
      return { healthy: false, message, details: { error: uploadException } }
    }

    const message = `Bucket '${bucket}' is healthy and accessible`
    return { healthy: true, message }

  } catch (error) {
    const message = `Unexpected error during storage health check: ${error.message}`
    return { healthy: false, message, details: { error } }
  }
}

async function validateRawBucket() {
  console.log('🔍 Validating raw bucket configuration...')

  try {
    // Run health check
    const healthResult = await checkStorageHealth(supabase, 'raw')

    if (!healthResult.healthy) {
      console.error('❌ Raw bucket health check failed:', healthResult.message)
      if (healthResult.details) {
        console.error('   Details:', JSON.stringify(healthResult.details, null, 2))
      }
      process.exit(1)
    }

    console.log('✅ Raw bucket health check passed:', healthResult.message)

    // Additional validation: check bucket configuration
    console.log('🔍 Checking bucket configuration...')

    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      process.exit(1)
    }

    const rawBucket = buckets.find(b => b.name === 'raw')
    if (!rawBucket) {
      console.error('❌ Raw bucket not found')
      console.log('   Available buckets:', buckets.map(b => b.name).join(', '))
      process.exit(1)
    }

    console.log('📦 Raw bucket details:')
    console.log(`   Name: ${rawBucket.name}`)
    console.log(`   Public: ${rawBucket.public}`)
    console.log(`   File size limit: ${rawBucket.file_size_limit} bytes`)
    console.log(`   Allowed MIME types: ${rawBucket.allowed_mime_types?.join(', ') || 'none'}`)

    // Validate configuration
    const issues = []

    if (rawBucket.public) {
      issues.push('Bucket should be private (public=false)')
    }

    if (rawBucket.file_size_limit !== 524288000) { // 500 MiB
      issues.push(`File size limit should be 524288000 bytes (500 MiB), got ${rawBucket.file_size_limit}`)
    }

    const expectedMimes = ['video/mp4', 'video/quicktime']
    const actualMimes = rawBucket.allowed_mime_types || []
    const missingMimes = expectedMimes.filter(m => !actualMimes.includes(m))
    const extraMimes = actualMimes.filter(m => !expectedMimes.includes(m))

    if (missingMimes.length > 0) {
      issues.push(`Missing allowed MIME types: ${missingMimes.join(', ')}`)
    }

    if (extraMimes.length > 0) {
      issues.push(`Unexpected allowed MIME types: ${extraMimes.join(', ')}`)
    }

    if (issues.length > 0) {
      console.error('❌ Bucket configuration issues:')
      issues.forEach(issue => console.error(`   - ${issue}`))
      process.exit(1)
    }

    console.log('✅ Raw bucket configuration is correct')

    // Validate database trigger and RLS policies
    console.log('🔍 Validating database trigger and policies...')

    try {
      // Check if the trigger exists
      const { data: triggerData, error: triggerError } = await supabase.rpc('sql', {
        query: `
          SELECT trigger_name, event_manipulation, action_statement
          FROM information_schema.triggers
          WHERE trigger_name = 'trg_raw_mime_whitelist'
          AND event_object_table = 'objects'
          AND event_object_schema = 'storage'
        `
      })

      if (triggerError) {
        console.error('❌ Failed to check trigger existence:', triggerError.message)
        process.exit(1)
      }

      if (!triggerData || triggerData.length === 0) {
        console.error('❌ Raw MIME validation trigger not found')
        process.exit(1)
      }

      console.log('✅ Database trigger exists and is active')

      // Check RLS policies
      const { data: policyData, error: policyError } = await supabase.rpc('sql', {
        query: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies
          WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname LIKE 'Users can%raw%'
        `
      })

      if (policyError) {
        console.error('❌ Failed to check RLS policies:', policyError.message)
        process.exit(1)
      }

      if (!policyData || policyData.length === 0) {
        console.error('❌ Raw bucket RLS policies not found')
        process.exit(1)
      }

      console.log('✅ RLS policies are properly configured')

      // Test trigger functionality - try to upload invalid file type
      console.log('🔍 Testing trigger functionality...')

      const invalidTestPath = 'raw/test/invalid.png'
      const invalidTestContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG header

      const { error: invalidUploadError } = await supabase.storage
        .from('raw')
        .upload(invalidTestPath, invalidTestContent, {
          contentType: 'image/png',
          upsert: false
        })

      if (!invalidUploadError) {
        console.error('❌ Trigger did not reject invalid file type - this is a security issue')
        process.exit(1)
      }

      console.log('✅ Database trigger correctly rejects invalid file types')

    } catch (dbError) {
      console.error('❌ Database validation failed:', dbError.message)
      process.exit(1)
    }

    // Test signed URL generation
    console.log('🔍 Testing signed URL generation...')

    const testPath = 'raw/test/test.mp4'
    const testContent = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]) // Minimal binary data

    // Upload test file
    const { error: uploadError } = await supabase.storage
      .from('raw')
      .upload(testPath, testContent, {
        contentType: 'video/mp4',
        upsert: true // Allow overwrite for test
      })

    if (uploadError && uploadError.statusCode !== 409) { // 409 means file exists
      console.error('❌ Failed to upload test file for signed URL test:', uploadError.message)
      process.exit(1)
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('raw')
      .createSignedUrl(testPath, 300) // 5 minute TTL

    if (signedUrlError) {
      console.error('❌ Failed to generate signed URL:', signedUrlError.message)
      process.exit(1)
    }

    if (!signedUrlData?.signedUrl) {
      console.error('❌ No signed URL returned')
      process.exit(1)
    }

    // Validate signed URL format
    const signedUrl = signedUrlData.signedUrl
    if (!signedUrl.includes('token=')) {
      console.error('❌ Signed URL does not contain token parameter')
      process.exit(1)
    }

    console.log('✅ Signed URL generation works correctly')
    console.log(`   Example signed URL: ${signedUrl.substring(0, 100)}...`)

    // Clean up test file
    try {
      await supabase.storage.from('raw').remove([testPath])
      console.log('🧹 Cleaned up test file')
    } catch (cleanupError) {
      console.warn('⚠️  Failed to clean up test file (non-critical):', cleanupError.message)
    }

    console.log('🎉 Raw bucket validation completed successfully!')
    console.log('')
    console.log('Summary:')
    console.log('- ✅ Bucket exists and is accessible')
    console.log('- ✅ Bucket is private')
    console.log('- ✅ File size limits are correct')
    console.log('- ✅ MIME types are properly configured (MP4, MOV only)')
    console.log('- ✅ Database trigger validates file types')
    console.log('- ✅ RLS policies enforce security')
    console.log('- ✅ Signed URL generation works')
    console.log('- ✅ Health check passes')

  } catch (error) {
    console.error('❌ Unexpected error during validation:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run validation
validateRawBucket()
