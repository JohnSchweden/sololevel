#!/usr/bin/env node

/**
 * List Supabase Storage Buckets
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env')
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key] = value
        }
      }
    }
    console.log('✅ Loaded environment variables from .env')
  } catch (error) {
    console.log('⚠️  No .env file found, using existing environment variables')
  }
}

// Load .env file
loadEnv()

// Supabase local configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  console.error('Add it to your .env file:')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listBuckets() {
  try {
    console.log('📦 Listing Supabase Storage buckets...')

    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Failed to list buckets:', error.message)
      return
    }

    console.log('✅ Available buckets:')
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (public: ${bucket.public})`)
      console.log(`     File size limit: ${bucket.file_size_limit || 'unlimited'}`)
      console.log(`     Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'none'}`)
    })

  } catch (error) {
    console.error('❌ Error listing buckets:', error.message)
  }
}

listBuckets()
