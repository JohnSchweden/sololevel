import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('🚀 Upload Pipeline Real-World Smoke Test')
console.log('=========================================')

try {
  // Authenticate
  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('🔐 Authenticating...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'testpass123'
  })
  if (signInError) throw new Error(`Auth failed: ${signInError.message}`)
  const userId = signInData.user?.id
  console.log(`✅ Authenticated as ${userId}`)

  // Create test video blob
  const testBlob = new Blob(['test video content'], { type: 'video/mp4' })
  console.log(`📹 Created test blob: ${testBlob.size} bytes`)

  // Step 1: Create signed upload URL (must include user ID in path)
  console.log('🔗 Creating signed upload URL...')
  const timestamp = Date.now()
  const filename = 'smoke-test-video.mp4'
  const path = `${userId}/${timestamp}_${filename}`
  const { data: signedData, error: signedError } = await supabase.storage
    .from('raw')
    .createSignedUploadUrl(path, 1000)

  if (signedError) throw new Error(`Signed URL failed: ${signedError.message}`)
  console.log('✅ Signed URL created')

  // Step 2: Upload file via fetch
  console.log('⬆️ Uploading file...')
  const response = await fetch(signedData.signedUrl, {
    method: 'PUT',
    body: testBlob,
    headers: { 'Content-Type': 'video/mp4' }
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }
  console.log('✅ File uploaded successfully')

  // Step 3: Create video recording record
  console.log('🗄️ Creating database record...')
  const { data: recording, error: dbError } = await supabase
    .from('video_recordings')
    .insert({
      user_id: userId,
      filename,
      original_filename: filename,
      file_size: testBlob.size,
      duration_seconds: 5,
      format: 'mp4',
      storage_path: signedData.path,
      upload_status: 'completed',
      upload_progress: 100,
    })
    .select()
    .single()

  if (dbError) throw new Error(`Database insert failed: ${dbError.message}`)
  console.log('✅ Database record created')

  // Step 4: Verify the record
  console.log('🔍 Verifying database record...')
  const { data: verifyRecord, error: verifyError } = await supabase
    .from('video_recordings')
    .select('*')
    .eq('id', recording.id)
    .single()

  if (verifyError) throw new Error(`Verification failed: ${verifyError.message}`)
  if (verifyRecord.upload_status !== 'completed') {
    throw new Error(`Upload status is ${verifyRecord.upload_status}, expected 'completed'`)
  }

  console.log('✅ Database record verified')

  // Clean up
  console.log('🧹 Cleaning up test record...')
  await supabase.from('video_recordings').delete().eq('id', recording.id)

  console.log('🎉 Upload pipeline real-world smoke test PASSED')
  console.log('   ✅ Authentication works')
  console.log('   ✅ Signed URLs work')
  console.log('   ✅ File upload works')
  console.log('   ✅ Database operations work')
  process.exit(0)

} catch (error) {
  console.error('❌ Upload pipeline real-world smoke test FAILED')
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
}
