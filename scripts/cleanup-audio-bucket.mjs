#!/usr/bin/env node

/**
 * Audio Bucket Cleanup Script
 * Identifies and handles non-compliant files in the audio bucket
 * Run this before enabling strict MIME validation to avoid data loss
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
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`
    }
  }
})

/**
 * Validate if a file meets the new audio requirements
 */
function isValidAudioFile(name, metadata) {
  // Check file extension
  const fileExtension = name.toLowerCase().split('.').pop()
  if (!['mp3', 'wav'].includes(fileExtension)) {
    return { valid: false, reason: `Invalid extension: .${fileExtension}` }
  }

  // Check MIME type
  const mimeType = metadata?.mimetype?.toLowerCase()
  const validMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']

  if (!mimeType) {
    return { valid: false, reason: 'No MIME type in metadata' }
  }

  if (!validMimes.includes(mimeType)) {
    return { valid: false, reason: `Invalid MIME type: ${mimeType}` }
  }

  return { valid: true }
}

async function cleanupAudioBucket() {
  console.log('🧹 Audio Bucket Cleanup - Identifying Non-Compliant Files')
  console.log('=' .repeat(70))

  try {
    // Get all files in the audio bucket
    console.log('📂 Scanning audio bucket for files...')

    const { data: files, error: listError } = await supabase.storage
      .from('audio')
      .list('', {
        limit: 1000, // Adjust if you have more files
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      console.error('❌ Failed to list files in audio bucket:', listError.message)
      process.exit(1)
    }

    if (!files || files.length === 0) {
      console.log('✅ Audio bucket is empty - no cleanup needed')
      return
    }

    console.log(`📊 Found ${files.length} files in audio bucket`)

    // Categorize files
    const validFiles = []
    const invalidFiles = []
    const filesToReview = []

    for (const file of files) {
      const validation = isValidAudioFile(file.name, file.metadata)

      if (validation.valid) {
        validFiles.push(file)
      } else {
        // Check if it's a test file or old valid format (AAC)
        const isTestFile = file.name.includes('/test/') || file.name.includes('/healthcheck/')
        const isOldValidFormat = file.name.toLowerCase().endsWith('.aac') ||
                                file.metadata?.mimetype === 'audio/aac'

        if (isTestFile) {
          filesToReview.push({ ...file, reason: `${validation.reason} (test file)` })
        } else if (isOldValidFormat) {
          filesToReview.push({ ...file, reason: `${validation.reason} (old AAC format)` })
        } else {
          invalidFiles.push({ ...file, reason: validation.reason })
        }
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   ✅ Valid files (MP3/WAV): ${validFiles.length}`)
    console.log(`   ⚠️  Files to review: ${filesToReview.length}`)
    console.log(`   ❌ Invalid files: ${invalidFiles.length}`)

    // Show details
    if (invalidFiles.length > 0) {
      console.log('\n❌ Invalid Files (will be rejected by new validation):')
      invalidFiles.forEach(file => {
        console.log(`   - ${file.name} (${file.reason})`)
      })
    }

    if (filesToReview.length > 0) {
      console.log('\n⚠️  Files to Review (may need manual handling):')
      filesToReview.forEach(file => {
        console.log(`   - ${file.name} (${file.reason})`)
      })
    }

    // Ask for cleanup action
    if (invalidFiles.length > 0) {
      console.log('\n🗑️  Cleanup Options:')
      console.log('   1. Delete invalid files automatically')
      console.log('   2. Move invalid files to quarantine bucket')
      console.log('   3. Show details only (no action)')
      console.log('   4. Create quarantine bucket and move all invalid files')

      const action = process.argv[2] || '3'

      switch (action) {
        case '1':
          console.log('\n🗑️  Deleting invalid files...')
          await deleteFiles(invalidFiles)
          break

        case '2':
          console.log('\n📦 Moving invalid files to quarantine bucket...')
          await moveToQuarantine(invalidFiles, 'audio-quarantine')
          break

        case '3':
          console.log('\n👀 Showing details only - no action taken')
          break

        case '4':
          console.log('\n📦 Creating quarantine bucket and moving all invalid files...')
          await moveToQuarantine(invalidFiles.concat(filesToReview), 'audio-quarantine')
          break

        default:
          console.log('\n❓ Invalid action specified. Use: node cleanup-audio-bucket.mjs [1-4]')
          break
      }
    } else {
      console.log('\n✅ No invalid files found - cleanup not needed')
    }

    console.log('\n🎉 Cleanup analysis completed!')

  } catch (error) {
    console.error('❌ Cleanup failed with error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

async function deleteFiles(files) {
  const fileNames = files.map(f => f.name)

  const { error } = await supabase.storage
    .from('audio')
    .remove(fileNames)

  if (error) {
    console.error('❌ Failed to delete files:', error.message)
  } else {
    console.log(`✅ Successfully deleted ${files.length} files`)
  }
}

async function moveToQuarantine(files, quarantineBucket) {
  console.log(`📦 Setting up quarantine bucket: ${quarantineBucket}`)

  // Create quarantine bucket if it doesn't exist
  const { error: createError } = await supabase.storage.createBucket(quarantineBucket, {
    public: false,
    allowedMimeTypes: ['*/*'], // Allow any type in quarantine
    fileSizeLimit: 52428800
  })

  if (createError && !createError.message.includes('already exists')) {
    console.error('❌ Failed to create quarantine bucket:', createError.message)
    return
  }

  console.log('✅ Quarantine bucket ready')

  // Move files one by one (Supabase doesn't have a bulk move operation)
  let successCount = 0
  let errorCount = 0

  for (const file of files) {
    try {
      // Download file content
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('audio')
        .download(file.name)

      if (downloadError) {
        console.error(`❌ Failed to download ${file.name}:`, downloadError.message)
        errorCount++
        continue
      }

      // Upload to quarantine
      const quarantinePath = `quarantine/${file.name}`
      const { error: uploadError } = await supabase.storage
        .from(quarantineBucket)
        .upload(quarantinePath, fileData, {
          contentType: file.metadata?.mimetype || 'application/octet-stream',
          upsert: false
        })

      if (uploadError) {
        console.error(`❌ Failed to upload ${file.name} to quarantine:`, uploadError.message)
        errorCount++
        continue
      }

      // Delete from original bucket
      const { error: deleteError } = await supabase.storage
        .from('audio')
        .remove([file.name])

      if (deleteError) {
        console.error(`❌ Failed to delete ${file.name} from audio bucket:`, deleteError.message)
        errorCount++
      } else {
        successCount++
        console.log(`✅ Moved ${file.name} to quarantine`)
      }

    } catch (error) {
      console.error(`❌ Unexpected error moving ${file.name}:`, error.message)
      errorCount++
    }
  }

  console.log(`\n📊 Move operation completed:`)
  console.log(`   ✅ Successfully moved: ${successCount} files`)
  console.log(`   ❌ Errors: ${errorCount} files`)

  if (successCount > 0) {
    console.log(`\n🔍 Quarantined files are available in bucket: ${quarantineBucket}`)
    console.log('   Review these files and decide whether to keep or delete them.')
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Audio Bucket Cleanup Script')
  console.log('Usage: node cleanup-audio-bucket.mjs [action]')
  console.log('')
  console.log('Actions:')
  console.log('  1  Delete invalid files automatically')
  console.log('  2  Move invalid files to quarantine bucket')
  console.log('  3  Show details only (no action) [default]')
  console.log('  4  Create quarantine bucket and move all invalid/review files')
  console.log('')
  console.log('Environment variables required:')
  console.log('  SUPABASE_URL')
  console.log('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(0)
}

// Run cleanup
cleanupAudioBucket()
