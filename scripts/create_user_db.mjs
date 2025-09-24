import pkg from 'pg'
const { Client } = pkg

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
})

async function createUser() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Check if user exists
    const checkResult = await client.query('SELECT id FROM auth.users WHERE email = $1', ['test@example.com'])
    if (checkResult.rows.length > 0) {
      console.log('User already exists')
      await client.end()
      return
    }

    // Insert user with bcrypt hash for 'password'
    await client.query(`
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
      VALUES ('00000000-0000-0000-0000-000000000000', $1, $2, now(), now(), now(), 'authenticated', 'authenticated')
      ON CONFLICT (id) DO NOTHING
    `, ['test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'])

    console.log('User created successfully')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

createUser()
