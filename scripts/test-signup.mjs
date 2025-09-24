import { createClient } from '@supabase/supabase-js'

// Use local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
  console.log('Testing user signup...')

  // Try to sign up a new user
  const { data, error } = await supabase.auth.signUp({
    email: 'newtest@example.com',
    password: 'password'
  })

  if (error) {
    console.error('❌ Signup failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }

  console.log('✅ Signup successful!')
  console.log('User:', data.user?.email)
  console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')

  // If email confirmation is required, we can't sign in immediately
  if (!data.user?.email_confirmed_at) {
    console.log('⚠️  Email confirmation required. User cannot sign in yet.')
    return
  }

  // Try to sign in immediately
  console.log('\nTesting immediate sign-in...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'newtest@example.com',
    password: 'password'
  })

  if (signInError) {
    console.error('❌ Sign-in failed:', signInError.message)
    process.exit(1)
  }

  console.log('✅ Sign-in successful!')
  console.log('User ID:', signInData.user?.id)
}

testSignup().catch(console.error)
