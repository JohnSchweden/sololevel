// Test for handleWebhookStart function
// Tests webhook handling, batched queries, and early status updates

import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { handleWebhookStart } from './handleWebhookStart.ts'

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

// Track database calls to verify batching
let batchedQueryUsed = false
let separateVideoRecordingsQueryCalled = false
let statusUpdateCalled = false
let statusUpdateValue: string | null = null

// Mock supabase client that tracks calls
const createMockSupabase = () => {
  batchedQueryUsed = false
  separateVideoRecordingsQueryCalled = false
  statusUpdateCalled = false
  statusUpdateValue = null

  return {
    from: (table: string) => {
      if (table === 'analysis_jobs') {
        return {
          select: (fields?: string) => {
            // Verify batched query includes video_recordings relation
            if (fields && typeof fields === 'string' && fields.includes('video_recordings')) {
              batchedQueryUsed = true
              return {
                eq: (field: string, value: any) => {
                  if (field === 'id' && value === 123) {
                    return {
                      single: () => Promise.resolve({
                        data: {
                          id: 123,
                          user_id: 'test-user-id',
                          video_recording_id: 456,
                          status: 'queued',
                          video_recordings: {
                            id: 456,
                            storage_path: 'test/video.mp4',
                            duration_seconds: 30
                          }
                        },
                        error: null
                      })
                    }
                  }
                  return {
                    single: () => Promise.resolve({
                      data: null,
                      error: { message: 'Not found' }
                    })
                  }
                }
              }
            }
            
            // Legacy path: separate queries (should fail test)
            return {
              eq: (field: string, value: any) => {
                if (field === 'id' && value === 123) {
                  return {
                    single: () => Promise.resolve({
                      data: {
                        id: 123,
                        user_id: 'test-user-id',
                        video_recording_id: 456,
                        status: 'queued'
                      },
                      error: null
                    })
                  }
                }
                return {
                  single: () => Promise.resolve({
                    data: null,
                    error: { message: 'Not found' }
                  })
                }
              }
            }
          },
          update: (data: any) => {
            statusUpdateCalled = true
            statusUpdateValue = data.status
            return {
              eq: (_field: string, _value: any) => Promise.resolve({
                data: { id: 123 },
                error: null
              })
            }
          }
        }
      }
      
      // Track if video_recordings is queried separately (should not happen)
      if (table === 'video_recordings') {
        separateVideoRecordingsQueryCalled = true
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: 456, storage_path: 'test/video.mp4', duration_seconds: 30 },
                error: null
              })
            })
          })
        }
      }
      
      // Default handler for other tables (pipeline may call these)
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        })
      }
    },
    rpc: () => Promise.resolve({ data: null, error: null })
  }
}

Deno.test('handleWebhookStart - batches analysis_jobs and video_recordings queries', async () => {
  // Arrange
  const mockSupabase = createMockSupabase()
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'X-Db-Webhook-Secret': 'test-secret',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      record: { id: 123 }
    })
  })

  // Set environment variable for secret (Deno allows this)
  Deno.env.set('DB_WEBHOOK_SECRET', 'test-secret')
  Deno.env.set('AI_ANALYSIS_MOCK_SERVICES', 'true') // Use mock services to avoid Gemini API calls

  try {
    // Act
    const response = await handleWebhookStart({
      req,
      supabase: mockSupabase as any,
      logger: mockLogger
    })

    // Assert
    assertEquals(response.status, 200)
    // Verify batched query was used (includes video_recordings relation)
    assertEquals(batchedQueryUsed, true, 'Should use batched query with video_recordings relation')
    // Verify video_recordings was NOT queried separately
    assertEquals(separateVideoRecordingsQueryCalled, false, 'Should NOT query video_recordings separately')
    
    const body = await response.json()
    assertEquals(body.analysisId, 123)
    assertEquals(body.status, 'processing')
  } finally {
    Deno.env.delete('DB_WEBHOOK_SECRET')
    Deno.env.delete('AI_ANALYSIS_MOCK_SERVICES')
  }
})

Deno.test('handleWebhookStart - updates status to processing BEFORE pipeline starts', async () => {
  // Arrange
  const mockSupabase = createMockSupabase()
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'X-Db-Webhook-Secret': 'test-secret',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      record: { id: 123 }
    })
  })

  // Set environment variable for secret
  Deno.env.set('DB_WEBHOOK_SECRET', 'test-secret')

  try {
    // Act
    const response = await handleWebhookStart({
      req,
      supabase: mockSupabase as any,
      logger: mockLogger
    })

    // Assert
    assertEquals(response.status, 200)
    // Verify status was updated
    assertEquals(statusUpdateCalled, true, 'Status update should be called')
    assertEquals(statusUpdateValue, 'processing', 'Status should be set to processing')
  } finally {
    Deno.env.delete('DB_WEBHOOK_SECRET')
  }
})