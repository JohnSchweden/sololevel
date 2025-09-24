import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('🔥 Raw Upload Smoke Test')
console.log('=======================')

try {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('1. Signing in...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'testpass123'
  })

  if (signInError) {
    throw new Error(`Sign-in failed: ${signInError.message}`)
  }

  const userId = signInData.user?.id
  console.log(`✅ Signed in as ${userId}`)

  console.log('2. Creating signed upload URL...')
  const path = `${userId}/smoke-upload.mp4`
  const { data: signedData, error: signedError } = await supabase.storage.from('raw').createSignedUploadUrl(path, 1000)

  if (signedError) {
    throw new Error(`Signed URL creation failed: ${signedError.message}`)
  }

  console.log('✅ Signed URL created')

  console.log('3. Uploading tiny file...')
  // Create a tiny test blob
  const testBlob = new Blob(['test upload data'], { type: 'video/mp4' })

  const response = await fetch(signedData.signedUrl, {
    method: 'PUT',
    body: testBlob,
    headers: {
      'Content-Type': 'video/mp4',
    },
  })

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`)
  }

  console.log('✅ Upload successful')

  // Optional: Try to list the file (might not work with user permissions)
  console.log('4. Checking if file exists...')
  try {
    const { data: files, error: listError } = await supabase.storage.from('raw').list(`${userId}/`, {
      limit: 10,
      sortBy: { column: 'name', order: 'asc' }
    })

    if (listError) {
      console.log('⚠️  File listing failed (expected with user permissions):', listError.message)
    } else {
      const uploadedFile = files?.find(f => f.name === 'smoke-upload.mp4')
      if (uploadedFile) {
        console.log('✅ File found in listing:', uploadedFile.name)
      } else {
        console.log('⚠️  File not found in listing (might be permission issue)')
      }
    }
  } catch (e) {
    console.log('⚠️  File check failed:', e.message)
  }

  console.log('🎉 Raw upload smoke test PASSED')
  process.exit(0)

} catch (error) {
  console.error('❌ Raw upload smoke test FAILED')
  console.error(error.message)
  process.exit(1)
}
