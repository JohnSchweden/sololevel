import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
)

async function signUp() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password'
    })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('Success:', data)
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

signUp()
