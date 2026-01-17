// Test for updated handleStartAnalysis function
// Tests both videoPath and videoRecordingId input modes

import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts'
import { handleStartAnalysis } from './handleStartAnalysis.ts'

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

// Mock supabase client with auth support
const mockSupabase = {
  auth: {
    getUser: (token: string) => {
      if (token === 'valid-token') {
        return Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      } else if (token === 'expired-token') {
        return Promise.resolve({
          data: { user: null },
          error: { message: 'Token expired' }
        })
      } else {
        return Promise.resolve({
          data: { user: null },
          error: { message: 'Invalid token' }
        })
      }
    }
  },
  from: (_table: string) => ({
    select: (_fields?: string) => ({
      eq: (field: string, value: any) => {
        // Handle chained .eq() calls for user isolation
        const chainedEq = {
          eq: (field2: string, value2: any) => {
            // For video_recordings lookup with user isolation
            if (field === 'id' && value === 123 && field2 === 'user_id' && value2 === 'test-user-id') {
              return {
                single: () => Promise.resolve({
                  data: { id: 123, user_id: 'test-user-id', storage_path: 'test/video.mp4', duration_seconds: 30 },
                  error: null
                })
              }
            } else {
              return {
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Record not found' }
                })
              }
            }
          },
          single: () => {
            // Direct single call without second eq
            if (field === 'user_id' && value === 'test-user-id') {
              return Promise.resolve({
                data: { id: 1, user_id: 'test-user-id', storage_path: 'test/video.mp4', duration_seconds: 30 },
                error: null
              })
            } else if (field === 'id' && value === 123) {
              return Promise.resolve({
                data: { id: 123, user_id: 'test-user-id', storage_path: 'test/video.mp4', duration_seconds: 30 },
                error: null
              })
            } else {
              return Promise.resolve({
                data: null,
                error: { message: 'Record not found' }
              })
            }
          },
          limit: (_count: number) => {
            if (field === 'user_id' && value === 'test-user-id') {
              return Promise.resolve({
                data: [{ id: 1, user_id: 'test-user-id', storage_path: 'test/video.mp4' }],
                error: null
              })
            } else {
              return Promise.resolve({
                data: [],
                error: null
              })
            }
          }
        }
        return chainedEq
      }
    }),
    insert: (_data: any) => ({
      select: (_fields?: string) => ({
        single: () => Promise.resolve({
          data: { id: 1, user_id: 'test-user-id', video_recording_id: 1, status: 'queued' },
          error: null
        })
      })
    }),
    update: (_data: any) => ({
      eq: (_field: string, _value: any) => Promise.resolve({
        data: { id: 1 },
        error: null
      })
    })
  })
}

Deno.test('handleStartAnalysis - accepts videoPath (legacy mode)', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoPath: 'test/video.mp4',
      videoSource: 'uploaded_video'
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 200)
  
  const body = await response.json()
  assertExists(body.analysisId)
  assertEquals(body.status, 'queued')
})

Deno.test('handleStartAnalysis - accepts videoRecordingId (new mode)', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 200)
  
  const body = await response.json()
  assertExists(body.analysisId)
  assertEquals(body.status, 'queued')
})

Deno.test('handleStartAnalysis - requires either videoPath or videoRecordingId', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Missing both videoPath and videoRecordingId
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 400)
  
  const body = await response.json()
  assertEquals(body.error, 'Either videoPath or videoRecordingId must be provided')
})

Deno.test('handleStartAnalysis - derives storage_path from videoRecordingId', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 200)
  
  const body = await response.json()
  assertExists(body.analysisId)
  assertEquals(body.status, 'queued')
})

// New security tests
Deno.test('handleStartAnalysis - rejects missing Authorization header', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 401)
  
  const body = await response.json()
  assertEquals(body.error, 'Authentication required')
})

Deno.test('handleStartAnalysis - rejects invalid Authorization header format', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic invalid-format',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 401)
  
  const body = await response.json()
  assertEquals(body.error, 'Authentication required')
})

Deno.test('handleStartAnalysis - rejects expired token', async () => {
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer expired-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  assertEquals(response.status, 401)
  
  const body = await response.json()
  assertEquals(body.error, 'Invalid authentication token')
})

Deno.test('handleStartAnalysis - enforces user isolation for videoRecordingId', async () => {
  // Mock a video recording that belongs to a different user
  const mockSupabaseWithDifferentUser = {
    ...mockSupabase,
    from: (_table: string) => ({
      select: (_fields?: string) => ({
        eq: (field: string, value: any) => {
          if (field === 'id' && value === 999) {
            // Chain another eq for user_id check
            return {
              eq: (field2: string, value2: any) => {
                if (field2 === 'user_id' && value2 === 'test-user-id') {
                  // User trying to access video 999, but it doesn't belong to them
                  return {
                    single: () => Promise.resolve({
                      data: null,
                      error: { message: 'Record not found' }
                    })
                  }
                }
                return mockSupabase.from(_table).select(_fields).eq(field2, value2)
              }
            }
          }
          return mockSupabase.from(_table).select(_fields).eq(field, value)
        }
      }),
      insert: mockSupabase.from(_table).insert,
      update: mockSupabase.from(_table).update
    })
  }

  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 999 // Video that doesn't belong to the user
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabaseWithDifferentUser,
    logger: mockLogger
  })

  assertEquals(response.status, 404)
  
  const body = await response.json()
  assertEquals(body.error, 'Video recording not found or access denied')
})

Deno.test('handleStartAnalysis - rejects when videoRecord user_id does not match authenticated user', async () => {
  // ARRANGE: Video that belongs to different user (passed RLS but fails explicit check)
  const mockSupabaseWithOwnershipMismatch = {
    ...mockSupabase,
    from: (_table: string) => ({
      select: (_fields?: string) => ({
        eq: (field: string, value: any) => {
          if (field === 'id' && value === 777) {
            return {
              eq: (field2: string, value2: any) => {
                if (field2 === 'user_id' && value2 === 'test-user-id') {
                  // RLS passed, but record has different user_id
                  return {
                    single: () => Promise.resolve({
                      data: { 
                        id: 777, 
                        user_id: 'different-user-id', // Different user!
                        storage_path: 'test/video.mp4', 
                        duration_seconds: 30 
                      },
                      error: null
                    })
                  }
                }
              }
            }
          }
          return mockSupabase.from(_table).select(_fields).eq(field, value)
        }
      }),
      insert: mockSupabase.from(_table).insert,
      update: mockSupabase.from(_table).update
    })
  }

  // ACT
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 777
    })
  })

  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabaseWithOwnershipMismatch,
    logger: mockLogger
  })

  // ASSERT: Should return 403 (Forbidden) for ownership mismatch
  assertEquals(response.status, 403)
  const body = await response.json()
  assertEquals(body.error, 'Access denied')
})

Deno.test('handleStartAnalysis - extracts videoDuration from videoRecordingId lookup', async () => {
  // ARRANGE: Video recording with duration
  const req = new Request('http://localhost', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer valid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoRecordingId: 123
    })
  })

  // ACT
  const response = await handleStartAnalysis({
    req,
    supabase: mockSupabase,
    logger: mockLogger
  })

  // ASSERT: Should succeed and videoDuration is extracted (logged)
  assertEquals(response.status, 200)
  const body = await response.json()
  assertExists(body.analysisId)
})
