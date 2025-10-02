#!/usr/bin/env node

/**
 * Comprehensive realtime test:
 * 1. Subscribe to analysis_jobs changes
 * 2. Insert a record to trigger realtime event
 * 3. Verify event is received
 */

import { createClient } from '@supabase/supabase-js'
import { WebSocket } from 'ws'
import { createDbClient, createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

// Set global WebSocket for Supabase client
global.WebSocket = WebSocket

const logger = createScriptLogger('test-realtime-comprehensive')

async function testComprehensiveRealtime() {
  const config = getScriptConfig()

  // Use service role key to bypass auth issues
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey)

  logger.info('🔍 Starting comprehensive realtime test...')

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error('Test timed out after 20 seconds')
      reject(new Error('Timeout'))
    }, 20000)

    let eventReceived = false

    // Subscribe to analysis_jobs changes
    const channel = supabase
      .channel('test-comprehensive')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
        },
        (payload) => {
          logger.success(`✅ Received realtime event: ${payload.eventType} for job ${payload.new?.id}`)
          eventReceived = true
        }
      )
      .subscribe((status, err) => {
        logger.info(`📡 Subscription status: ${status}${err ? ` (Error: ${err})` : ''}`)

        if (status === 'SUBSCRIBED') {
          logger.success('✅ Successfully subscribed to analysis_jobs realtime!')

          // Now insert a test record to trigger an event
          setTimeout(async () => {
            try {
              const dbClient = await createDbClient(config)
              await dbClient.connect()

              logger.info('Inserting test analysis job...')
              await dbClient.query(`
                INSERT INTO analysis_jobs (user_id, video_recording_id, status, progress_percentage)
                VALUES ('488a7161-a2c7-40dc-88ac-d27e1ea3c0b0', '1', 'queued', 0)
              `)

              logger.info('Test record inserted, waiting for realtime event...')

              // Wait a bit for the event
              setTimeout(() => {
                if (eventReceived) {
                  logger.success('🎉 Realtime test PASSED - event received!')
                  clearTimeout(timeout)
                  channel.unsubscribe()
                  dbClient.end()
                  resolve('success')
                } else {
                  logger.error('Realtime test FAILED - no event received')
                  clearTimeout(timeout)
                  channel.unsubscribe()
                  dbClient.end()
                  reject(new Error('No event received'))
                }
              }, 3000)

            } catch (err) {
              logger.error('Error inserting test record:', err.message)
              clearTimeout(timeout)
              channel.unsubscribe()
              reject(err)
            }
          }, 500)

        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ Subscription failed with CHANNEL_ERROR')
          clearTimeout(timeout)
          reject(new Error('CHANNEL_ERROR'))
        } else if (status === 'TIMED_OUT') {
          logger.error('❌ Subscription timed out')
          clearTimeout(timeout)
          reject(new Error('TIMED_OUT'))
        }
      })
  })
}

testComprehensiveRealtime()
  .then(() => {
    console.log('🎉 Comprehensive realtime test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Comprehensive realtime test failed:', error.message)
    process.exit(1)
  })
