import pkg from 'pg'
const { Client } = pkg

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
})

async function checkUser() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Check auth.users table
    const result = await client.query(`
      SELECT id, email, email_confirmed_at, encrypted_password, created_at, aud, role
      FROM auth.users
      WHERE email = $1
    `, ['test@example.com'])

    if (result.rows.length === 0) {
      console.log('❌ User not found in auth.users')
      await client.end()
      return
    }

    const user = result.rows[0]
    console.log('User found:')
    console.log('- ID:', user.id)
    console.log('- Email:', user.email)
    console.log('- Email confirmed:', !!user.email_confirmed_at)
    console.log('- AUD:', user.aud)
    console.log('- Role:', user.role)
    console.log('- Created:', user.created_at)
    console.log('- Password hash exists:', !!user.encrypted_password)

    // Check if password hash looks correct (bcrypt format)
    const bcryptRegex = /^\$2[aby]\$\d{1,2}\$[.\/A-Za-z0-9]{53}$/
    console.log('- Password hash format valid:', bcryptRegex.test(user.encrypted_password))

    await client.end()
  } catch (err) {
    console.error('Error:', err)
  }
}

checkUser()
