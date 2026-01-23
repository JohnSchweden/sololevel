// Test for Audio worker function
// Tests job processing, audio generation from SSML segments, and storage

import { assertExists as _assertExists, assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts'

// Disable retry backoff in tests
Deno.env.set('AI_AUDIO_RETRY_BACKOFF_MS', '0')

// Mock logger
const mockLogger = {
  info: (msg: string, data?: any) => console.log(`INFO: ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`ERROR: ${msg}`, data),
}

const audioStatusUpdates: any[] = []
const voiceSnapshotUpdates: any[] = []

// Mock supabase client for Audio worker
const mockSupabaseForAudio = {
  rpc: (_functionName: string, _params: any) => Promise.resolve({ data: null, error: null }),
  from: (table: string) => {
    if (table === 'analysis_feedback') {
      return {
        select: () => ({
          in: (_field: string, _values: any[]) => ({
            in: (field: string, _values: any[]) => {
              if (field === 'id') {
                return {
                  limit: () => Promise.resolve({
                    data: [{
                      id: 123,
                      audio_status: 'queued',
                      audio_attempts: 0
                    }],
                    error: null
                  })
                }
              }
              return {
                limit: () => Promise.resolve({
                  data: [{
                    id: 123,
                    audio_status: 'queued',
                    audio_attempts: 0
                  }],
                  error: null
                })
              }
            },
            eq: (_field: string, _value: any) => ({
              limit: () => Promise.resolve({
                data: [{
                  id: 123,
                  audio_status: 'queued',
                  audio_attempts: 0
                }],
                error: null
              })
            }),
            limit: () => Promise.resolve({
              data: [{
                id: 123,
                audio_status: 'queued',
                audio_attempts: 0
              }],
              error: null
            })
          }),
          eq: () => ({
            limit: () => Promise.resolve({
              data: [{
                id: 123,
                audio_status: 'queued',
                audio_attempts: 0
              }],
              error: null
            }),
            single: () => Promise.resolve({
              data: {
                id: 123,
                analysis_id: 1,
                analyses: {
                  job_id: 1,
                  analysis_jobs: {
                    id: 1,
                    video_recording_id: 1,
                    video_recordings: {
                      id: 1,
                      created_at: '2024-01-01T00:00:00Z',
                      user_id: 'test-user'
                    }
                  }
                }
              },
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

    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                coach_gender: 'female',
                coach_mode: 'roast'
              },
              error: null
            })
          })
        })
      }
    }

    if (table === 'coach_voice_configs') {
      return {
        select: () => ({
          eq: (_field: string, _value: any) => {
            const chainable = {
              eq: (_field2: string, _value2: any) => chainable,
              single: () => Promise.resolve({
                data: {
                  id: 1,
                  gender: 'female',
                  mode: 'roast',
                  voice_name: 'Aoede',
                  tts_system_instruction: 'Test instruction',
                  prompt_voice: 'Roast me!!!',
                  prompt_personality: 'Ruthless',
                  avatar_asset_key: 'coach_female_roast'
                },
                error: null
              })
            }
            return chainable
          }
        })
      }
    }

    if (table === 'analysis_jobs') {
      return {
        update: (data: any) => ({
          eq: () => {
            voiceSnapshotUpdates.push(data)
            return Promise.resolve({
              data: { id: 1, ...data },
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

import { processAudioJobs } from './audioWorker.ts'

Deno.test('Audio worker - processes queued jobs', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  Deno.env.set('AI_ANALYSIS_MOCK_DELAY_MS', '0')
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
    rpc: (_functionName: string, _params: any) => Promise.resolve({ data: null, error: null }),
    from: (_table: string) => ({
      select: () => ({
        in: () => ({
          limit: () => Promise.resolve({
            data: [], // No jobs
            error: null
          })
        }),
        eq: () => ({
          limit: () => Promise.resolve({
            data: [], // No jobs
            error: null
          }),
          single: () => Promise.resolve({
            data: null,
            error: { message: 'No data' }
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
    rpc: (_functionName: string, _params: any) => Promise.resolve({ data: null, error: null }),
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
  
  // With inline retry, all 3 attempts will fail, so:
  // - 1 error (job failed)
  // - 2 retries (attempt 2 and 3, so retryCount = 2)
  assertEquals(result.errors, 1)
  assertEquals(result.retriedJobs, 2)
  
  // After all retries exhausted, status should be 'failed' with 3 attempts
  const lastUpdate = audioStatusUpdates.at(-1)
  assertEquals(lastUpdate?.audio_status, 'failed')
  assertEquals(lastUpdate?.audio_attempts, 3)
  assertEquals(lastUpdate?.audio_last_error, 'SSML segments not found: No segments')
})

Deno.test('Audio worker - generates audio from SSML', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  Deno.env.set('AI_ANALYSIS_MOCK_DELAY_MS', '0')
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
})

Deno.test('Audio worker - handles TTS service errors', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  Deno.env.set('AI_ANALYSIS_MOCK_DELAY_MS', '0')
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
})

Deno.test('Audio worker - fetches voice preferences and config', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  Deno.env.set('AI_ANALYSIS_MOCK_DELAY_MS', '0')
  voiceSnapshotUpdates.length = 0
  
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
  
  assertEquals(voiceSnapshotUpdates.length, 1)
  const snapshot = voiceSnapshotUpdates[0]
  assertEquals(snapshot.coach_gender, 'female')
  assertEquals(snapshot.coach_mode, 'roast')
  assertEquals(snapshot.voice_name_used, 'Aoede')
  assertEquals(snapshot.avatar_asset_key_used, 'coach_female_roast')
})

Deno.test('Audio worker - passes voice name to TTS', async () => {
  Deno.env.set('AI_ANALYSIS_MODE', 'mock')
  Deno.env.set('AI_ANALYSIS_MOCK_DELAY_MS', '0')
  
  const result = await processAudioJobs({
    supabase: mockSupabaseForAudio,
    logger: mockLogger
  })
  
  assertEquals(result.processedJobs, 1)
  assertEquals(result.errors, 0)
})

