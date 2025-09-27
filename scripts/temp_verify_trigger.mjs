#!/usr/bin/env node

import { createSmokeServiceClient } from './smoke/smoke-utils.mjs'

async function verifyTrigger() {
  console.log('🔍 Verifying trigger installation...\n')

  const supabase = await createSmokeServiceClient()

  try {
    // Check video recording id=19 first
    console.log('1. Checking video recording id=19:')
    const { data: videoData, error: videoError } = await supabase
      .from('video_recordings')
      .select('storage_path, upload_status')
      .eq('id', 19)

    // Also check the latest video recording (id=2 from smoke test)
    console.log('\n1b. Checking latest video recording (id=2):')
    const { data: latestVideoData, error: latestVideoError } = await supabase
      .from('video_recordings')
      .select('id, storage_path, upload_status')
      .eq('id', 2)

    if (videoError) {
      console.log('❌ Error checking video recording:', videoError.message)
    } else if (!videoData || videoData.length === 0) {
      console.log('ℹ️  No video recording found with id=19')
    } else {
      console.log('✅ Video recording data:', videoData[0])
    }

    if (latestVideoError) {
      console.log('❌ Error checking latest video recording:', latestVideoError.message)
    } else if (!latestVideoData || latestVideoData.length === 0) {
      console.log('ℹ️  No video recording found with id=2')
    } else {
      console.log('✅ Latest video recording data:', latestVideoData[0])
    }

    // Check storage objects
    console.log('\n2. Checking storage objects via Storage API:')
    const { data: objectsData, error: objectsError } = await supabase.storage
      .listBuckets()

    if (objectsError) {
      console.log('❌ Error checking storage buckets:', objectsError.message)
    } else {
      console.log('✅ Storage buckets:', objectsData)

      // Try to list objects in raw bucket
      if (objectsData.some(b => b.id === 'raw')) {
        const { data: rawObjects, error: rawError } = await supabase.storage
          .from('raw')
          .list('', {
            limit: 5,
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (rawError) {
          console.log('❌ Error listing raw bucket objects:', rawError.message)
        } else {
          console.log('✅ Raw bucket objects (last 5):', rawObjects)
        }
      }
    }

    // Check if we can access the trigger function
    console.log('\n3. Checking if trigger function exists:')
    const { data: funcData, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'finalize_video_on_raw_object')

    if (funcError) {
      console.log('❌ Error checking function:', funcError.message)
    } else if (!funcData || funcData.length === 0) {
      console.log('ℹ️  Function finalize_video_on_raw_object not found')
    } else {
      console.log('✅ Function exists:', funcData[0])
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

verifyTrigger().catch(console.error)
