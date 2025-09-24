import { createClient } from '@supabase/supabase-js'
// Dynamic import from source (works in monorepo development)
const { uploadVideo } = await import('./packages/api/src/services/videoUploadService.js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('🚀 UploadVideo Real-World Smoke Test')
console.log('====================================')

try {
  // Authenticate
  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('🔐 Authenticating...')
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'testpass123'
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
  if (result.upload_status !== 'completed') throw new Error(`Upload status is ${result.upload_status}, expected 'completed'`)
  if (result.upload_progress !== 100) throw new Error(`Upload progress is ${result.upload_progress}, expected 100`)
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
  process.exit(0)

} catch (error) {
  console.error('❌ UploadVideo real-world smoke test FAILED')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
