import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key] = value
        }
      }
    }
  } catch (_error) {
    console.warn('No .env file found, using existing environment variables')
  }
}

loadEnv()

// Use production Supabase configuration if available, otherwise local
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  const testEmail = 'test@example.com'
  const testPassword = 'password'

  try {
    console.log(`Creating test user: ${testEmail}`)
    console.log(`Using Supabase URL: ${supabaseUrl}`)

    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('Test user already exists:', testEmail)
        return
      }
      console.error('Error creating user:', error)
      process.exit(1)
    } else {
      console.log('User created successfully:', data.user?.email)
      console.log('User ID:', data.user?.id)
    }
  } catch (err) {
    console.error('Failed to create user:', err)
    process.exit(1)
  }
}

createTestUser()
