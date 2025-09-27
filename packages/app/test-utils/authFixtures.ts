import type { Session, User } from '@supabase/supabase-js'

// Base Supabase user fixture matching Supabase typings
const baseUser: User = {
  id: 'user-123',
  aud: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  phone: '',
  confirmation_sent_at: '2024-01-01T00:00:00Z',
  confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  factors: [],
  identities: [],
  user_metadata: {},
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
}

// Base Supabase session fixture aligning with Session type
const baseSession: Session = {
  access_token: 'access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'refresh-token',
  provider_token: null,
  provider_refresh_token: null,
  user: baseUser,
}

export interface AuthFixtureOverrides {
  user?: Partial<User>
  session?: Partial<Session>
}

// Factory to create a fully typed Supabase user
export function createSupabaseUser(overrides: Partial<User> = {}): User {
  return {
    ...baseUser,
    ...overrides,
  }
}

// Factory to create a fully typed Supabase session
export function createSupabaseSession(overrides: Partial<Session> = {}): Session {
  const userOverride = overrides.user ? createSupabaseUser(overrides.user) : undefined

  return {
    ...baseSession,
    ...overrides,
    user: userOverride ?? baseSession.user,
  }
}

// Convenience helper returning both session and user
export function createAuthFixtures(overrides: AuthFixtureOverrides = {}) {
  const user = createSupabaseUser(overrides.user ?? {})
  const session = createSupabaseSession({ user, ...overrides.session })

  return { user, session }
}
