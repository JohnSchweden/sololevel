import { createClient } from '@supabase/supabase-js'

// Use local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    debug: true
  }
})

async function debugAuth() {
  console.log('Debugging authentication...')

  // Try different passwords
  const passwords = ['password', 'test', '123456']

  for (const password of passwords) {
    console.log(`\nTrying password: "${password}"`)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: password
      })

      if (error) {
        console.log(`❌ Failed: ${error.message}`)
      } else {
        console.log('✅ Success!')
        console.log('User ID:', data.user?.id)
        return
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`)
    }
  }

  console.log('\nNone of the common passwords worked. Let me check the actual hash...')

  // Check what password the hash corresponds to
  const bcrypt = await import('bcryptjs')

  const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

  console.log('Testing if hash matches "password":', await bcrypt.compare('password', hash))
  console.log('Testing if hash matches "test":', await bcrypt.compare('test', hash))
  console.log('Testing if hash matches "123456":', await bcrypt.compare('123456', hash))
}

debugAuth().catch(console.error)
