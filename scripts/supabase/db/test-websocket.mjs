#!/usr/bin/env node

/**
 * Basic WebSocket connection test to Supabase Realtime
 */

import { WebSocket } from 'ws'
import { getScriptConfig } from '../../utils/env.mjs'

const logger = getScriptConfig().logger || {
  info: (...args) => console.log('[WEBSOCKET]', ...args),
  success: (...args) => console.log('[WEBSOCKET] ✅', ...args),
  error: (...args) => console.log('[WEBSOCKET] ❌', ...args),
}

async function testWebSocketConnection() {
  const config = getScriptConfig()

  logger.info('🔍 Testing basic WebSocket connection to Realtime...')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error('WebSocket test timed out after 10 seconds')
      reject(new Error('Timeout'))
    }, 10000)

    // Construct WebSocket URL for Supabase realtime (Phoenix channel endpoint)
    // Local CLI proxies realtime via the API gateway on 54321 at /realtime/v1/websocket
    // Phoenix requires a version query param (vsn=1.0.0)
    const wsUrl = `ws://127.0.0.1:54321/realtime/v1/websocket?apikey=${config.supabase.anonKey}&vsn=1.0.0`

    logger.info('Connecting to:', wsUrl.substring(0, 60) + '...')

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      logger.success('✅ WebSocket connection opened!')
      clearTimeout(timeout)

      // Send a basic message to test
      const testMessage = {
        topic: 'realtime:test',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: true },
            presence: { key: '' }
          }
        },
        ref: '1'
      }

      ws.send(JSON.stringify(testMessage))
      logger.info('Sent test message')

      setTimeout(() => {
        ws.close()
        resolve('success')
      }, 2000)
    }

    ws.onmessage = (event) => {
      logger.success('📨 Received message:', event.data)
    }

    ws.onerror = (error) => {
      logger.error('WebSocket error:', error.message || error)
      clearTimeout(timeout)
      reject(error)
    }

    ws.onclose = (event) => {
      logger.info('WebSocket closed:', event.code, event.reason)
    }
  })
}

testWebSocketConnection()
  .then(() => {
    console.log('🎉 WebSocket test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ WebSocket test failed:', error.message)
    process.exit(1)
  })
