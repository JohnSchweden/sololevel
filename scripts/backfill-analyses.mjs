#!/usr/bin/env node

/**
 * Backfill script for normalizing analysis_jobs data into analyses and analysis_audio_segments
 * This script populates the new normalized schema from existing data
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
const envPath = join(__dirname, '..', 'env.dev.example')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const [key, ...valueParts] = line.split('=')
      return [key, valueParts.join('=').replace(/['"]/g, '')]
    })
)

const supabase = createClient(
  env.SUPABASE_URL || process.env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backfillAnalyses() {
  console.log('Starting backfill of analyses table...')

  try {
    // Call the backfill function created in the migration
    const { data, error } = await supabase.rpc('backfill_analyses_from_jobs')

    if (error) {
      console.error('Error during backfill:', error)
      return
    }

    console.log('Backfill completed successfully')

    // Verify the backfill
    const { data: analysesCount } = await supabase
      .from('analyses')
      .select('id', { count: 'exact', head: true })

    const { data: segmentsCount } = await supabase
      .from('analysis_audio_segments')
      .select('id', { count: 'exact', head: true })

    console.log(`Created ${analysesCount} analyses records`)
    console.log(`Updated ${segmentsCount} audio segments`)

  } catch (error) {
    console.error('Backfill failed:', error)
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  await backfillAnalyses()
}

main().catch(console.error)
