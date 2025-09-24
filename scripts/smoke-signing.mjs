import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('🔥 Policy/Signing Smoke Test')
console.log('===========================')

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
  const path = `${userId}/smoke-test.mp4`
  const { data, error } = await supabase.storage.from('raw').createSignedUploadUrl(path, 1000000)

  if (error) {
    throw new Error(`Signed URL creation failed: ${error.message}`)
  }

  console.log('✅ Signed URL created successfully')
  console.log(`   Signed URL: ${data.signedUrl.substring(0, 60)}...`)
  console.log(`   Path: ${data.path}`)
  console.log(`   Token: ${data.token.substring(0, 30)}...`)

  // Verify URL structure
  if (!data.signedUrl.startsWith('http://127.0.0.1:54321/storage/v1/object/upload/sign/raw/')) {
    throw new Error('Signed URL does not match expected format')
  }

  console.log('🎉 Policy/signing smoke test PASSED')
  process.exit(0)

} catch (error) {
  console.error('❌ Policy/signing smoke test FAILED')
  console.error(error.message)
  process.exit(1)
}
