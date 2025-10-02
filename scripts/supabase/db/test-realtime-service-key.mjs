#!/usr/bin/env node

/**
 * Test realtime with service role key (no JWT auth)
 */

import { createClient } from '@supabase/supabase-js'
import { WebSocket } from 'ws'
import { createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

// Set global WebSocket for Supabase client
global.WebSocket = WebSocket

const logger = createScriptLogger('test-realtime-service-key')

async function testRealtimeWithServiceKey() {
  const config = getScriptConfig()

  // Use service role key instead of anon key
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

  console.log('🔍 Testing realtime with service role key (no JWT)...')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('❌ Service key realtime test timed out after 15 seconds')
      reject(new Error('Timeout'))
    }, 15000)

    const channel = supabase
      .channel('test-service-key')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
        },
        (payload) => {
          console.log('✅ Received realtime event:', payload.eventType, payload.new?.id)
          clearTimeout(timeout)
          resolve(payload)
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Service key channel status:', status, err ? `Error: ${err}` : '')

        if (status === 'SUBSCRIBED') {
          console.log('✅ Service key realtime subscription successful!')
          clearTimeout(timeout)
          setTimeout(() => {
            channel.unsubscribe()
            resolve('success')
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Service key realtime failed with CHANNEL_ERROR')
          clearTimeout(timeout)
          reject(new Error('CHANNEL_ERROR'))
        } else if (status === 'TIMED_OUT') {
          console.log('❌ Service key realtime timed out')
          clearTimeout(timeout)
          reject(new Error('TIMED_OUT'))
        }
      })
  })
}

testRealtimeWithServiceKey()
  .then(() => {
    console.log('🎉 Service key realtime test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Service key realtime test failed:', error.message)
    process.exit(1)
  })
