// Test for handleRetryAudio function
// Tests audio retry endpoint for specific feedback IDs

import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { handleRetryAudio } from './handleRetryAudio.ts'

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

// Mock auth user
const mockUser = { id: 'user-123' }

// Create mock Supabase client
const createMockSupabase = (options: {
  analysisFound?: boolean
  analysisUserId?: string
  feedbackItems?: Array<{ id: number; analysis_id: string }>
  updateError?: any
}) => {
  const {
    analysisFound = true,
    analysisUserId = 'user-123',
    feedbackItems = [{ id: 1, analysis_id: 'test-analysis-uuid' }],
    updateError = null,
  } = options

  return {
    auth: {
      getUser: () => Promise.resolve({
        data: { user: mockUser },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'analyses') {
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                if (analysisFound) {
                  return Promise.resolve({
                    data: {
                      id: 'test-analysis-uuid',
                      job_id: 1,
                      analysis_jobs: { user_id: analysisUserId },
                    },
                    error: null,
                  })
                }
                return Promise.resolve({
                  data: null,
                  error: { message: 'Not found' },
                })
              },
            }),
          }),
        }
      }
      if (table === 'analysis_feedback') {
        return {
          select: () => ({
            in: (field: string, values: any[]) => {
              if (field === 'id') {
                return Promise.resolve({
                  data: feedbackItems.filter((item) => values.includes(item.id)),
                  error: null,
                })
              }
              return Promise.resolve({ data: feedbackItems, error: null })
            },
          }),
          update: () => ({
            in: () => Promise.resolve({ data: null, error: updateError }),
          }),
        }
      }
      return {}
    },
  }
}


Deno.test('handleRetryAudio - should reject requests without valid Authorization header', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Invalid' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
      feedbackIds: [1],
    }),
  })

  const mockSupabase = createMockSupabase({})

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 401)
  const body = await response.json()
  assertEquals(body.error, 'Missing or invalid Authorization header')
})

Deno.test('handleRetryAudio - should reject requests without analysisId', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      feedbackIds: [1],
    }),
  })

  const mockSupabase = createMockSupabase({})

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 400)
  const body = await response.json()
  assertEquals(body.error, 'Missing or invalid analysisId')
})

Deno.test('handleRetryAudio - should reject requests without feedbackIds', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
    }),
  })

  const mockSupabase = createMockSupabase({})

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 400)
  const body = await response.json()
  assertEquals(body.error, 'Missing or empty feedbackIds array')
})

Deno.test('handleRetryAudio - should reject requests with invalid feedbackIds', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
      feedbackIds: ['invalid', 1],
    }),
  })

  const mockSupabase = createMockSupabase({})

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 400)
  const body = await response.json()
  assertEquals(body.error, 'feedbackIds must be an array of integers')
})

Deno.test('handleRetryAudio - should return 404 when analysis not found', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'nonexistent-analysis',
      feedbackIds: [1],
    }),
  })

  const mockSupabase = createMockSupabase({ analysisFound: false })

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 404)
  const body = await response.json()
  assertEquals(body.error, 'Analysis not found')
})

Deno.test('handleRetryAudio - should return 403 when user does not own analysis', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
      feedbackIds: [1],
    }),
  })

  const mockSupabase = createMockSupabase({ analysisUserId: 'different-user-456' })

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 403)
  const body = await response.json()
  assertEquals(body.error, 'Forbidden')
})

Deno.test('handleRetryAudio - should return 404 when no feedback items found', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
      feedbackIds: [999],
    }),
  })

  const mockSupabase = createMockSupabase({ feedbackItems: [] })

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 404)
  const body = await response.json()
  assertEquals(body.error, 'No feedback items found')
})

Deno.test('handleRetryAudio - should return 400 when feedback items do not belong to analysis', async () => {
  // ARRANGE
  const req = new Request('http://localhost/retry-audio', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({
      analysisId: 'test-analysis-uuid',
      feedbackIds: [1],
    }),
  })

  const mockSupabase = createMockSupabase({
    feedbackItems: [{ id: 1, analysis_id: 'different-analysis-id' }],
  })

  // ACT
  const response = await handleRetryAudio({ req, supabase: mockSupabase, logger: mockLogger })

  // ASSERT
  assertEquals(response.status, 400)
  const body = await response.json()
  assertEquals(body.error, 'Feedback items do not belong to specified analysis')
})

// Note: Full integration test with processAudioJobs would require mocking the worker module
// These tests focus on endpoint behavior: authentication, validation, database updates
