import { createClient } from '@supabase/supabase-js'

// Use service role directly
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser() {
  console.log('Creating test user with service role...')

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password',
    email_confirm: true
  })

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('✅ User already exists')
    } else {
      console.error('❌ Error creating user:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✅ User created successfully:', data.user?.email)
  }

  // Test that we can sign in with the user
  console.log('\nTesting sign-in with created user...')

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  })

  if (signInError) {
    console.error('❌ Sign-in failed:', signInError.message)
    process.exit(1)
  }

  console.log('✅ Sign-in successful!')
  console.log('User ID:', signInData.user?.id)
  console.log('Email:', signInData.user?.email)

  // Test database access
  console.log('\nTesting database access...')

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

  console.log('\n🎉 All tests passed! Authentication is working.')
}

createUser().catch(console.error)
