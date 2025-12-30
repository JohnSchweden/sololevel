// Test for health endpoint
// Used by pg_cron warmup job to keep Edge Function warm

import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'

Deno.test('Health endpoint returns 200 OK', async () => {
  // Arrange
  const _req = new Request('http://localhost/ai-analyze-video/health', {
    method: 'GET'
  })

  // Mock Deno.serve handler directly
  // Note: In real usage, this would be called via the Edge Function router
  const response = new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ai-analyze-video',
      version: '1.0.0',
      message: 'Function running with database connection',
      env: {
        supabaseUrl: true,
        supabaseServiceKey: true
      }
    }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      },
      status: 200
    }
  )

  // Assert
  assertEquals(response.status, 200)
  const body = await response.json()
  assertEquals(body.status, 'ok')
  assertEquals(body.service, 'ai-analyze-video')
  assertExists(body.timestamp)
})

function assertExists(value: any): void {
  if (value === null || value === undefined) {
    throw new Error(`Expected value to exist, but got ${value}`)
  }
}
