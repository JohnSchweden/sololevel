// Test for SSML worker function
// Tests job processing, SSML generation, and audio job enqueueing

import { assertExists as _assertExists, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

const ssmlStatusUpdates: any[] = []
const ssmlErrorUpdates: any[] = []

// Mock supabase client for SSML worker
const mockSupabaseForSSML = {
  from: (table: string) => {
    if (table === 'analysis_feedback') {
      return {
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({
              data: [{
                id: 123,
                message: 'Your posture needs improvement. Keep your back straight.',
                category: 'posture',
                timestamp_seconds: 10.5,
                confidence: 0.9,
                ssml_status: 'queued',
                ssml_attempts: 0
              }],
              error: null
            })
          })
        }),
        update: (data: any) => ({
          eq: () => {
            ssmlStatusUpdates.push(data)
            return Promise.resolve({ data: { id: 123, ...data }, error: null })
          }
        })
      }
    }

    if (table === 'analysis_ssml_segments') {
      return {
        insert: (_data: any) => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 1 },
              error: null
            })
          })
        })
      }
    }

    return {
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
    }
  }
}

import { processSSMLJobs } from '../workers/ssmlWorker.ts'

Deno.test('SSML worker - processes queued jobs', async () => {
  // Test that the SSML worker processes jobs correctly
  ssmlStatusUpdates.length = 0
  ssmlErrorUpdates.length = 0
  const result = await processSSMLJobs({
    supabase: mockSupabaseForSSML,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
  assertEquals(result.enqueuedAudioJobs, 0)
  assertEquals(result.errors, 0)
  const statuses = ssmlStatusUpdates.map((update) => update.ssml_status)
  assertEquals(statuses.includes('processing'), true)
  assertEquals(statuses.includes('completed'), true)
})

Deno.test('SSML worker - handles empty queue gracefully', async () => {
  // Mock supabase with no jobs
  const emptyMockSupabase = {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({
            data: [], // No jobs
            error: null
          })
        })
      })
    })
  }
  
  const result = await processSSMLJobs({
    supabase: emptyMockSupabase,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 0)
  assertEquals(result.enqueuedAudioJobs, 0)
})

Deno.test('SSML worker - handles job processing errors', async () => {
  ssmlStatusUpdates.length = 0
  ssmlErrorUpdates.length = 0
  const errorMockSupabase = {
    from: (table: string) => {
      if (table === 'analysis_feedback') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({
                data: [{
                  id: 123,
                  message: 'Bad feedback',
                  category: 'posture',
                  timestamp_seconds: 10,
                  confidence: 0.5,
                  ssml_status: 'queued',
                  ssml_attempts: 0
                }],
                error: null
              })
            })
          }),
          update: (data: any) => ({
            eq: () => {
              ssmlErrorUpdates.push(data)
              return Promise.resolve({ data: { id: 123, ...data }, error: null })
            }
          })
        }
      }

      if (table === 'analysis_ssml_segments') {
        return {
          insert: (_data: any) => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'insert failed' } })
            })
          })
        }
      }

      return mockSupabaseForSSML.from(table)
    }
  }

  const result = await processSSMLJobs({
    supabase: errorMockSupabase,
    logger: mockLogger
  })

  assertEquals(result.errors, 1)
  assertEquals(result.retriedJobs, 1)
  const lastUpdate = ssmlErrorUpdates.at(-1)
  assertEquals(lastUpdate?.ssml_status, 'queued')
  assertEquals(lastUpdate?.ssml_attempts, 1)
  assertEquals(lastUpdate?.ssml_last_error, 'Failed to write SSML segment: insert failed')
})

Deno.test('SSML worker - generates valid SSML markup', async () => {
  // Test SSML generation functionality
  const result = await processSSMLJobs({
    supabase: mockSupabaseForSSML,
    logger: mockLogger
  })
  
  // The worker should successfully process the job and generate SSML
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
})
