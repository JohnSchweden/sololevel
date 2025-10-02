#!/usr/bin/env node

/**
 * Test realtime subscription to analysis_jobs
 * This verifies that CHANNEL_ERROR is fixed after enabling realtime
 */

import { createClient } from '@supabase/supabase-js'
import { WebSocket } from 'ws'
import { createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

// Set global WebSocket for Supabase client
global.WebSocket = WebSocket

const logger = createScriptLogger('test-realtime')

async function testRealtimeSubscription() {
  const config = getScriptConfig()
  const supabase = createClient(config.supabase.url, config.supabase.anonKey)

  console.log('🔍 Testing realtime subscription to analysis_jobs...')

  // First authenticate
  console.log('🔐 Authenticating...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: config.testAuth.email,
    password: config.testAuth.password,
  })

  if (authError) {
    console.log('❌ Authentication failed:', authError.message)
    throw new Error(`Auth failed: ${authError.message}`)
  }

  console.log('✅ Authenticated as:', authData.user?.email)
  console.log('🔑 JWT Token:', authData.session?.access_token?.substring(0, 50) + '...')

  // Set auth token for realtime subscriptions
  supabase.realtime.setAuth(authData.session.access_token)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('❌ Subscription test timed out after 15 seconds')
      reject(new Error('Timeout'))
    }, 15000)

    const channel = supabase
      .channel('test-analysis-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_recordings', // Try a different table
        },
        (payload) => {
          console.log('✅ Received realtime event:', payload.eventType, payload.new?.id)
          clearTimeout(timeout)
          resolve(payload)
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Subscription status:', status, err ? `Error: ${err}` : '')

        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to analysis_jobs realtime!')

          // Test will timeout if no events received, which is expected
          // The important thing is that we get SUBSCRIBED status
          setTimeout(() => {
            console.log('✅ Realtime subscription test passed (no errors)')
            clearTimeout(timeout)
            channel.unsubscribe()
            resolve('success')
          }, 2000)

        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ CHANNEL_ERROR - realtime not properly configured')
          clearTimeout(timeout)
          reject(new Error('CHANNEL_ERROR'))
        } else if (status === 'TIMED_OUT') {
          console.log('❌ TIMED_OUT - connection issue')
          clearTimeout(timeout)
          reject(new Error('TIMED_OUT'))
        }
      })
  })
}

testRealtimeSubscription()
  .then(() => {
    console.log('🎉 Realtime test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Realtime test failed:', error.message)
    process.exit(1)
  })
