import { createClient } from '@supabase/supabase-js'

// Use local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('Testing authentication with test@example.com...')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  })

  if (error) {
    console.error('❌ Authentication failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Authentication successful!')
  console.log('User ID:', data.user?.id)
  console.log('Email:', data.user?.email)

  // Test getting user session
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
  if (sessionError) {
    console.error('❌ Failed to get user session:', sessionError.message)
    process.exit(1)
  }

  console.log('✅ User session confirmed!')
  console.log('Session user ID:', sessionData.user?.id)

  // Test database access (should work with RLS)
  const { data: recordings, error: dbError } = await supabase
    .from('video_recordings')
    .select('*')
    .limit(1)

  if (dbError) {
    console.error('❌ Database access failed:', dbError.message)
    process.exit(1)
  }

  console.log('✅ Database access works!')
  console.log('Found', recordings?.length || 0, 'video recordings')

  console.log('🎉 All authentication tests passed!')
}

testAuth().catch(console.error)
