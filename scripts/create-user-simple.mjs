import pkg from 'pg'
const { Client } = pkg

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
})

// bcrypt hash for "password"
const passwordHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

async function createUserDirect() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Delete existing user if any
    await client.query('DELETE FROM auth.users WHERE email = $1', ['test@example.com'])
    console.log('Deleted existing user')

    // Create new user directly
    await client.query(`
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
      VALUES (gen_random_uuid(), $1, $2, now(), now(), now(), 'authenticated', 'authenticated')
    `, ['test@example.com', passwordHash])

    console.log('✅ User created successfully')
    await client.end()

    // Now test authentication
    console.log('\nTesting authentication...')
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = 'http://127.0.0.1:54321'
    const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    })

    if (error) {
      console.error('❌ Authentication still failed:', error.message)
      process.exit(1)
    }

    console.log('✅ Authentication successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)

  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

createUserDirect()
