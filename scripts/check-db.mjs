#!/usr/bin/env node

/**
 * Quick database check script
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
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EDGE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAnalysisJob() {
  console.log('🔍 Checking analysis job 1...')

  // Check basic analysis job data
  const { data: job, error: jobError } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', 1)
    .single()

  if (jobError) {
    console.error('❌ Error fetching analysis job:', jobError)
    return
  }

  console.log('📋 Analysis Job:', {
    id: job.id,
    status: job.status,
    results: job.results,
    full_feedback_text: job.full_feedback_text ? job.full_feedback_text.substring(0, 100) + '...' : null,
    summary_text: job.summary_text ? job.summary_text.substring(0, 50) + '...' : null,
  })

  // Check feedback data
  const { data: feedback, error: feedbackError } = await supabase
    .from('analysis_feedback')
    .select('*')
    .eq('analysis_id', 1)

  if (feedbackError) {
    console.error('❌ Error fetching feedback:', feedbackError)
  } else {
    console.log('📝 Feedback items:', feedback.length)
    if (feedback.length > 0) {
      console.log('Sample feedback:', feedback[0])
    }
  }

  // Try the enhanced function
  try {
    const { data: enhanced, error: enhancedError } = await supabase.rpc('get_enhanced_analysis_with_feedback', {
      analysis_job_id: 1
    })

    if (enhancedError) {
      console.error('❌ Enhanced function error:', enhancedError)
    } else {
      console.log('✅ Enhanced function result:', {
        hasFeedback: enhanced?.[0]?.feedback?.length > 0,
        feedbackCount: enhanced?.[0]?.feedback?.length || 0,
        feedback: enhanced?.[0]?.feedback?.[0] || null
      })
    }
  } catch (error) {
    console.error('❌ Enhanced function call failed:', error.message)
  }
}

checkAnalysisJob().catch(console.error)
