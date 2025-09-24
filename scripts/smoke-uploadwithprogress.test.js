/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { uploadWithProgress } from './packages/api/src/services/videoUploadService.js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

describe('uploadWithProgress Unit Test', () => {
  let supabase
  let userId
  let signedUrl

  beforeAll(async () => {
    // Set Jest environment variable
    process.env.JEST_WORKER_ID = '1'

    supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Setting up test user...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'testuser@example.com',
      password: 'testpass123',
    })

    if (signInError) {
      throw new Error(`Sign-in failed: ${signInError.message}`)
    }

    userId = signInData.user?.id

    console.log('Creating signed URL...')
    const path = `${userId}/uploadwithprogress-test.mp4`
    const { data, error } = await supabase.storage.from('raw').createSignedUploadUrl(path, 1000)

    if (error) {
      throw new Error(`Signed URL creation failed: ${error.message}`)
    }

    signedUrl = data.signedUrl
  })

  it('should upload a file successfully and update progress', async () => {
    console.log('Testing uploadWithProgress...')

    // Create test blob
    const testBlob = new Blob(['uploadWithProgress test data'], { type: 'video/mp4' })

    // Mock progress callback
    let progressCalled = false
    let finalProgress = 0
    const onProgress = (progress) => {
      console.log(`Progress: ${progress}%`)
      progressCalled = true
      finalProgress = progress
    }

    // Call uploadWithProgress (should use fetch path in Jest)
    await uploadWithProgress(signedUrl, testBlob, 999, 888, onProgress)

    // Verify progress was called and reached 100%
    expect(progressCalled).toBe(true)
    expect(finalProgress).toBe(100)

    console.log('✅ uploadWithProgress test passed')
  }, 10000) // 10 second timeout

  afterAll(() => {
    // Clean up
    delete process.env.JEST_WORKER_ID
  })
})
