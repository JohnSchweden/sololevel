import { SMOKE_TEST_USER, createSmokeAnonClient, loadSmokeEnv } from './smoke-utils.mjs'
// Dynamic import from source (works in monorepo development)
const { uploadVideo } = await import('../packages/api/src/services/videoUploadService.js')

// Load environment variables
loadSmokeEnv()

const supabase = await createSmokeAnonClient()

console.log('🚀 UploadVideo Real-World Smoke Test')
console.log('====================================')

async function runSmokeTest() {
try {
  // Authenticate
  console.log('🔐 Authenticating...')
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: SMOKE_TEST_USER.email,
    password: SMOKE_TEST_USER.password
  })
  if (signInError) throw new Error(`Auth failed: ${signInError.message}`)
  console.log('✅ Authenticated')

  // Create test video blob
  const testBlob = new Blob(['test video content for uploadVideo'], { type: 'video/mp4' })
  console.log(`📹 Created test blob: ${testBlob.size} bytes`)

  // Track progress
  let progressReceived = false
  let uploadInitialized = false

  // Call uploadVideo
  console.log('⬆️ Starting uploadVideo...')
  const result = await uploadVideo({
    file: testBlob,
    originalFilename: 'smoke-test-video.mp4',
    durationSeconds: 5,
    format: 'mp4',
    onProgress: (progress) => {
      console.log(`📊 Progress: ${progress}%`)
      progressReceived = true
    },
    onUploadInitialized: (info) => {
      console.log(`🎯 Upload initialized: recordingId=${info.recordingId}, sessionId=${info.sessionId}`)
      uploadInitialized = true
    }
  })

  // Verify results
  console.log('🔍 Verifying results...')
  if (!result) throw new Error('uploadVideo returned null/undefined')
  if (!result.id) throw new Error('Result missing id')
  // Finalization now handled by Storage webhook; result may still be 'uploading'
  if (!progressReceived) throw new Error('Progress callback never called')
  if (!uploadInitialized) throw new Error('Upload initialized callback never called')

  // Verify database record
  console.log('🗄️ Verifying database record...')
  const { data: dbRecord, error: dbError } = await supabase
    .from('video_recordings')
    .select('id, filename, upload_status, upload_progress, storage_path')
    .eq('id', result.id)
    .single()

  if (dbError) throw new Error(`Database query failed: ${dbError.message}`)
  if (!dbRecord) throw new Error('Database record not found')
  // Allow a short delay for webhook to finalize; poll up to 10 times
  let tries = 10
  while (tries-- > 0 && dbRecord.upload_status !== 'completed') {
    await new Promise(r => setTimeout(r, 300))
    const refreshed = await supabase
      .from('video_recordings')
      .select('upload_status, upload_progress')
      .eq('id', result.id)
      .single()
    if (!refreshed.error && refreshed.data) {
      dbRecord.upload_status = refreshed.data.upload_status
      dbRecord.upload_progress = refreshed.data.upload_progress
    }
  }
  if (dbRecord.upload_status !== 'completed') throw new Error(`DB upload_status is ${dbRecord.upload_status}`)
  if (dbRecord.upload_progress !== 100) throw new Error(`DB upload_progress is ${dbRecord.upload_progress}`)
  if (dbRecord.filename !== 'smoke-test-video.mp4') throw new Error(`DB filename is ${dbRecord.filename}`)

  console.log('✅ Database record verified')

  // Clean up test record (optional)
  console.log('🧹 Cleaning up test record...')
  await supabase.from('video_recordings').delete().eq('id', result.id)

  console.log('🎉 UploadVideo real-world smoke test PASSED')
  console.log(`   ✅ Video uploaded successfully`)
  console.log(`   ✅ Database record created`)
  console.log(`   ✅ Progress callbacks fired`)
  console.log(`   ✅ Upload initialized callback fired`)

} catch (error) {
  console.error('❌ UploadVideo real-world smoke test FAILED')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  throw error
}
}

runSmokeTest().catch(console.error)
