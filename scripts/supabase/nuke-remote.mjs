#!/usr/bin/env node

/**
 * Nuclear Option: Empty ALL remote database tables and storage buckets
 * 
 * WARNING: This DELETES ALL DATA from your remote Supabase instance.
 * Use with extreme caution. Requires confirmation.
 * 
 * Usage:
 *   node scripts/supabase/nuke-remote.mjs [--env .env]
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import readline from 'readline'
import { createClient } from '@supabase/supabase-js'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

const log = (msg) => console.log(`[NUKE] ${msg}`)

// Load .env file if --env flag provided
const envFlagIndex = process.argv.indexOf('--env')
if (envFlagIndex !== -1 && process.argv[envFlagIndex + 1]) {
  const envPath = resolve(process.argv[envFlagIndex + 1])
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]+)=(.+)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim()
      }
    })
    log(`Loaded env from ${envPath}`)
  } catch (error) {
    log(`Failed to load ${envPath}: ${error.message}`)
  }
}

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
})

/**
 * Empty all storage buckets (recursively)
 */
async function emptyStorageBuckets() {
  log('📦 Emptying storage buckets...')
  
  const buckets = ['raw', 'processed', 'thumbnails']
  
  for (const bucket of buckets) {
    try {
      let totalDeleted = 0
      
      // Recursive function to delete all files in bucket
      async function deleteRecursive(prefix = '') {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 1000 })
        
        if (listError || !files || files.length === 0) return
        
        const filePaths = []
        const folders = []
        
        for (const file of files) {
          const path = prefix ? `${prefix}/${file.name}` : file.name
          
          // Folders have id === null
          if (file.id === null) {
            folders.push(path)
          } else {
            filePaths.push(path)
          }
        }
        
        // Delete files in this directory
        if (filePaths.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove(filePaths)
          
          if (!deleteError) {
            totalDeleted += filePaths.length
          }
        }
        
        // Recurse into subdirectories
        for (const folder of folders) {
          await deleteRecursive(folder)
        }
      }
      
      await deleteRecursive()
      
      if (totalDeleted === 0) {
        log(`✓ Bucket '${bucket}' already empty`)
      } else {
        log(`✓ Deleted ${totalDeleted} files from '${bucket}'`)
      }
    } catch (error) {
      log(`❌ Error processing bucket ${bucket}: ${error.message}`)
    }
  }
}

/**
 * Empty all database tables
 */
async function emptyDatabaseTables() {
  log('🗄️  Emptying database tables...')
  
  // Tables in dependency order (children first)
  const tables = [
    'analysis_audio_segments',
    'analysis_ssml_segments', 
    'analysis_feedback',
    'analyses',
    'analysis_jobs',
    'video_recordings',
    'upload_sessions',
    'user_feedback',
  ]
  
  for (const table of tables) {
    try {
      // Use gt with 0 to match all rows (works for both bigint and uuid)
      const { error } = await supabase
        .from(table)
        .delete()
        .gte('id', 0)
      
      if (error) {
        log(`❌ Failed to empty ${table}: ${error.message}`)
      } else {
        log(`✓ Emptied table '${table}'`)
      }
    } catch (error) {
      log(`❌ Error emptying ${table}: ${error.message}`)
    }
  }
}

/**
 * Show current database stats
 */
async function showStats() {
  log('\n=== REMOTE DATABASE STATS ===\n')
  
  const tables = [
    'video_recordings',
    'analysis_jobs', 
    'analyses',
    'analysis_feedback',
    'analysis_audio_segments',
    'analysis_ssml_segments',
    'upload_sessions',
    'user_feedback',
  ]
  
  log('Table Row Counts:')
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        log(`  ${table}: ERROR - ${error.message}`)
      } else {
        log(`  ${table}: ${count?.toLocaleString() || 0}`)
      }
    } catch (error) {
      log(`  ${table}: ERROR - ${error.message}`)
    }
  }
  
  log('\nStorage Buckets:')
  const buckets = ['raw', 'processed', 'thumbnails']
  for (const bucket of buckets) {
    try {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1 })
      
      if (error) {
        log(`  ${bucket}: ERROR - ${error.message}`)
      } else {
        // Get actual count (limit was just for speed check)
        const { data: allFiles } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1000 })
        log(`  ${bucket}: ${allFiles?.length || 0} files`)
      }
    } catch (error) {
      log(`  ${bucket}: ERROR - ${error.message}`)
    }
  }
  
  log('\n')
}

async function main() {
  log('☢️  NUCLEAR OPTION: Remote Database & Storage Cleanup')
  log('=' .repeat(70))
  log(`Target: ${supabaseUrl}`)
  log('=' .repeat(70))
  
  // Show current stats
  await showStats()
  
  // Require explicit confirmation
  log('⚠️  WARNING: This will DELETE ALL DATA from the remote database!')
  log('⚠️  This action CANNOT BE UNDONE!')
  log('')
  
  const confirm1 = await question('Type "DELETE EVERYTHING" to confirm: ')
  if (confirm1 !== 'DELETE EVERYTHING') {
    log('Aborted. No changes made.')
    rl.close()
    return
  }
  
  const confirm2 = await question('Are you ABSOLUTELY SURE? (yes/no): ')
  if (confirm2.toLowerCase() !== 'yes') {
    log('Aborted. No changes made.')
    rl.close()
    return
  }
  
  log('\n🚀 Starting nuclear cleanup...\n')
  
  // Empty storage buckets first
  await emptyStorageBuckets()
  
  log('')
  
  // Empty database tables
  await emptyDatabaseTables()
  
  log('\n✓ Nuclear cleanup complete!')
  log('Showing final stats...\n')
  
  // Show final stats
  await showStats()
  
  rl.close()
}

main().catch((error) => {
  log(`Error: ${error.message}`)
  console.error(error.stack)
  rl.close()
  process.exit(1)
})

