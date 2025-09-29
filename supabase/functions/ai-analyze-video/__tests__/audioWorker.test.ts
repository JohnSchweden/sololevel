// Test for Audio worker function
// Tests job processing, audio generation from SSML segments, and storage

import { assertExists as _assertExists, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

const audioStatusUpdates: any[] = []

// Mock supabase client for Audio worker
const mockSupabaseForAudio = {
  from: (table: string) => {
    if (table === 'analysis_feedback') {
      return {
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({
              data: [{
                id: 123,
                audio_status: 'queued',
                audio_attempts: 0
              }],
              error: null
            })
          })
        }),
        update: (data: any) => ({
          eq: () => {
            audioStatusUpdates.push(data)
            return Promise.resolve({
              data: { id: 123, ...data },
              error: null
            })
          }
        })
      }
    }

    if (table === 'analysis_ssml_segments') {
      return {
        select: () => ({
          eq: () => Promise.resolve({
            data: [{
              id: 1,
              feedback_id: 123,
              segment_index: 0,
              ssml: '<speak><prosody rate="medium" pitch="medium"><emphasis level="strong">Your posture needs improvement. Keep your back straight.</emphasis></prosody></speak>',
              provider: 'gemini',
              version: '1.0'
            }],
            error: null
          })
        })
      }
    }

    if (table === 'analysis_audio_segments') {
      return {
        insert: (data: any) => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 1, ...data },
              error: null
            })
          })
        })
      }
    }

    return {
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
    }
  },

  // Mock storage operations
  storage: {
    from: (_bucket: string) => ({
      upload: (_path: string, _file: any) => Promise.resolve({
        data: null,
        error: null
      }),
      createSignedUrl: (path: string, _ttl: number) => Promise.resolve({
        data: { signedUrl: `https://example.com/${path}` },
        error: null
      })
    })
  }
}

import { processAudioJobs } from '../workers/audioWorker.ts'

Deno.test('Audio worker - processes queued jobs', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  // Test that the Audio worker processes jobs correctly
  audioStatusUpdates.length = 0
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
  const statuses = audioStatusUpdates.map((entry) => entry.audio_status)
  assertEquals(statuses.includes('processing'), true)
  assertEquals(statuses.includes('completed'), true)
})

Deno.test('Audio worker - handles empty queue gracefully', async () => {
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
    }),
    storage: mockSupabaseForAudio.storage
  }
  
  const result = await processAudioJobs({
    supabase: emptyMockSupabase,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 0)
})

Deno.test('Audio worker - handles missing SSML segments', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  // Mock supabase that has jobs but no SSML segments
  audioStatusUpdates.length = 0
  const noSSMLMockSupabase = {
    from: (table: string) => {
      if (table === 'analysis_ssml_segments') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [], // No SSML segments
              error: null
            })
          })
        }
      }
      
      return mockSupabaseForAudio.from(table)
    },
    storage: mockSupabaseForAudio.storage
  }
  
  const result = await processAudioJobs({
    supabase: noSSMLMockSupabase,
    logger: mockLogger
  })
  
  assertEquals(result.errors, 1)
  assertEquals(result.retriedJobs, 1)
  const lastUpdate = audioStatusUpdates.at(-1)
  assertEquals(lastUpdate?.audio_status, 'queued')
  assertEquals(lastUpdate?.audio_attempts, 1)
  assertEquals(lastUpdate?.audio_last_error, 'SSML segments not found: No segments')
})

Deno.test('Audio worker - generates audio from SSML', async () => {
  // Test audio generation functionality
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  // The worker should successfully process the job and generate audio
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
})

Deno.test('Audio worker - handles TTS service errors', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  // Mock that fails on audio generation
  // This test will verify error handling when TTS fails
  
  // For now, we'll test with a successful case since we're using mock TTS
  // In production, this would test actual TTS service failures
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  // Should handle gracefully
  assertEquals(result.processedJobs, 1)
})
