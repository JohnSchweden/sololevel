#!/usr/bin/env node

/**
 * Check metadata stored in Supabase Storage objects
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMetadata() {
  try {
    console.log('🔍 Checking metadata in processed bucket...')

    // List files in processed bucket
    const { data: files, error: listError } = await supabase.storage
      .from('processed')
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (listError) {
      console.error('❌ Failed to list files:', listError.message)
      return
    }

    console.log('📁 Files in processed bucket:')
    for (const file of files || []) {
      console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes, created: ${file.created_at})`)

      // Try to get more details about the file
      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('processed')
          .download(file.name)

        if (fileError) {
          console.log(`     ❌ Could not download: ${fileError.message}`)
        } else {
          console.log(`     ✅ Downloadable (${fileData.size} bytes)`)
        }
      } catch (err) {
        console.log(`     ⚠️  Download error: ${err.message}`)
      }
    }

    // Try to query the database directly for metadata
    console.log('\n🗄️  Querying database for storage metadata...')

    try {
      const { data: objects, error: dbError } = await supabase.rpc('sql', {
        query: `
          SELECT name, metadata, created_at
          FROM storage.objects
          WHERE bucket_id = 'processed'
          ORDER BY created_at DESC
          LIMIT 5
        `
      })

      if (dbError) {
        console.log('❌ Database query failed:', dbError.message)
      } else {
        console.log('📊 Database objects:')
        objects.forEach(obj => {
          console.log(`   - ${obj.name}: metadata = ${JSON.stringify(obj.metadata)}, created = ${obj.created_at}`)
        })
      }
    } catch (rpcError) {
      console.log('❌ RPC query failed:', rpcError.message)
    }

  } catch (error) {
    console.error('❌ Error checking metadata:', error.message)
  }
}

checkMetadata()
