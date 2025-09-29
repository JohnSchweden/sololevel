#!/usr/bin/env node

// Script to diagnose SSML insert failures
// Run with: node scripts/diagnose-ssml-error.mjs

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseFeedback37() {
  console.log('🔍 Diagnosing SSML insert failure for feedbackId: 37\n')
  
  // Check if feedback exists
  console.log('1. Checking if feedback_id 37 exists in analysis_feedback...')
  const { data: feedback, error: feedbackError } = await supabase
    .from('analysis_feedback')
    .select('id, analysis_id, message, ssml_status')
    .eq('id', 37)
    .single()
    
  if (feedbackError) {
    console.log('❌ Feedback 37 not found:', feedbackError.message)
  } else {
    console.log('✅ Feedback 37 exists:', feedback)
  }
  
  // Check for existing SSML segments
  console.log('\n2. Checking for existing SSML segments for feedback_id 37...')
  const { data: existingSegments, error: segmentsError } = await supabase
    .from('analysis_ssml_segments')
    .select('*')
    .eq('feedback_id', 37)
    
  if (segmentsError) {
    console.log('❌ Error querying SSML segments:', segmentsError.message)
  } else {
    console.log(`Found ${existingSegments.length} existing SSML segments:`, existingSegments)
  }
  
  // Check table schema
  console.log('\n3. Checking analysis_ssml_segments table schema...')
  const { data: schema, error: schemaError } = await supabase
    .rpc('describe_table', { table_name: 'analysis_ssml_segments' })
    .catch(() => {
      // Fallback: try a simple select with limit 0 to see columns
      return supabase
        .from('analysis_ssml_segments')
        .select('*')
        .limit(0)
    })
    
  if (schemaError) {
    console.log('Schema check error:', schemaError.message)
  } else {
    console.log('Table exists and is queryable')
  }
  
  // Try the actual insert that failed
  console.log('\n4. Attempting the failed insert operation...')
  const testSsml = '<speak><p>Test SSML content</p></speak>'
  const { data: insertResult, error: insertError } = await supabase
    .from('analysis_ssml_segments')
    .insert({
      feedback_id: 37,
      segment_index: 0,
      ssml: testSsml,
      provider: 'gemini',
      version: '1.0',
      ssml_prompt: 'Test prompt for diagnosis'
    })
    .select('id')
    .single()
    
  if (insertError) {
    console.log('❌ Insert failed with error:', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint
    })
  } else {
    console.log('✅ Insert succeeded:', insertResult)
    
    // Clean up test record
    await supabase
      .from('analysis_ssml_segments')
      .delete()
      .eq('id', insertResult.id)
    console.log('🧹 Cleaned up test record')
  }
}

diagnoseFeedback37().catch(console.error)
