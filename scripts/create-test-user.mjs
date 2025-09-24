import { createClient } from '@supabase/supabase-js'
import pkg from 'pg'
const { Client } = pkg

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabase = createClient(supabaseUrl, supabaseKey)

const dbClient = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
})

async function createTestUser() {
  try {
    console.log('Creating test user...')

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email: 'testuser@example.com',
      password: 'testpass123'
    })

    if (error && !error.message.includes('already registered')) {
      console.error('Signup error:', error.message)
      return
    }

    console.log('User signed up:', data?.user?.email || 'already exists')

    // Confirm email in database
    await dbClient.connect()
    const result = await dbClient.query(
      'UPDATE auth.users SET email_confirmed_at = now() WHERE email = $1 AND email_confirmed_at IS NULL',
      ['testuser@example.com']
    )
    console.log(`Updated ${result.rowCount} user(s)`)
    await dbClient.end()

    console.log('Test user ready for testing')
  } catch (err) {
    console.error('Error:', err)
  }
}

createTestUser()
