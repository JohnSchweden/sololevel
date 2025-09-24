import { createClient } from '@supabase/supabase-js'
import pkg from 'pg'
const { Client } = pkg

// Use local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const dbClient = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
})

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignupAndConfirm() {
  try {
    console.log('Testing signup and manual confirmation...')

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email: 'confirmed@example.com',
      password: 'password'
    })

    if (error) {
      console.error('❌ Signup failed:', error.message)
      return
    }

    console.log('✅ Signup successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')

    if (!data.user?.id) {
      console.error('❌ No user ID returned')
      return
    }

    // Manually confirm email in database
    await dbClient.connect()
    console.log('Connected to database')

    await dbClient.query(`
      UPDATE auth.users
      SET email_confirmed_at = now()
      WHERE id = $1
    `, [data.user.id])

    console.log('✅ Email confirmed in database')

    // Now try to sign in
    console.log('\nTesting sign-in after confirmation...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'confirmed@example.com',
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

    console.log('\n🎉 All authentication tests passed!')

    await dbClient.end()

  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

testSignupAndConfirm()
