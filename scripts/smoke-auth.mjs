import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('🔥 Auth Smoke Test')
console.log('==================')

try {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('1. Signing in with testuser@example.com...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'testpass123'
  })

  if (signInError) {
    throw new Error(`Sign-in failed: ${signInError.message}`)
  }

  console.log('✅ Sign-in successful')
  console.log(`   User ID: ${signInData.user?.id}`)
  console.log(`   Email: ${signInData.user?.email}`)

  console.log('2. Verifying user session...')
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error(`User verification failed: ${userError?.message || 'no user'}`)
  }

  console.log('✅ User session verified')
  console.log(`   User ID: ${userData.user.id}`)
  console.log(`   Email: ${userData.user.email}`)

  console.log('🎉 Auth smoke test PASSED')
  process.exit(0)

} catch (error) {
  console.error('❌ Auth smoke test FAILED')
  console.error(error.message)
  process.exit(1)
}
