#!/usr/bin/env node

/**
 * Simple realtime test - check if realtime works at all
 */

import { createClient } from '@supabase/supabase-js'
import { WebSocket } from 'ws'
import { createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

// Set global WebSocket for Supabase client
global.WebSocket = WebSocket

console.log('🌐 Global WebSocket set:', !!global.WebSocket)

const logger = createScriptLogger('test-realtime-simple')

async function testBasicRealtime() {
  const config = getScriptConfig()
  const supabase = createClient(config.supabase.url, config.supabase.anonKey)

  console.log('🔍 Testing basic realtime connectivity...')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log('❌ Basic realtime test timed out after 15 seconds')
      reject(new Error('Timeout'))
    }, 15000)

    // Subscribe to published table changes to verify realtime connectivity
    const channel = supabase
      .channel('test-basic')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_recordings',
        },
        (payload) => {
          console.log('✅ Received realtime event:', payload.eventType, payload.new?.id)
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Basic channel status:', status, err ? `Error: ${err}` : '')
        console.log('📡 Full error object:', err)

        if (status === 'SUBSCRIBED') {
          console.log('✅ Basic realtime subscription successful!')
          clearTimeout(timeout)
          setTimeout(() => {
            channel.unsubscribe()
            resolve('success')
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Basic realtime failed with CHANNEL_ERROR')
          clearTimeout(timeout)
          reject(new Error('CHANNEL_ERROR'))
        } else if (status === 'TIMED_OUT') {
          console.log('❌ Basic realtime timed out')
          clearTimeout(timeout)
          reject(new Error('TIMED_OUT'))
        }
      })
  })
}

testBasicRealtime()
  .then(() => {
    console.log('🎉 Basic realtime test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Basic realtime test failed:', error.message)
    process.exit(1)
  })
