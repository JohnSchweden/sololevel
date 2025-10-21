import { _resetBootstrapForTesting, testAuthBootstrap } from './testAuthBootstrap'

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web', // Default to web for tests
  },
}))

// Mock the auth client
jest.mock('@my/api', () => ({
  authClient: {
    signInWithPassword: jest.fn(),
    getCurrentUserId: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}))

// Mock logger
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock environment variables
const originalEnv = process.env

describe('testAuthBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    _resetBootstrapForTesting() // Reset singleton between tests
    // Reset environment and ensure we're in test mode
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    }
    delete process.env.EXPO_PUBLIC_ENV
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does nothing when TEST_AUTH_ENABLED is not set', async () => {
    delete process.env.TEST_AUTH_ENABLED

    const result = await testAuthBootstrap()

    expect(result.success).toBe(true)
    expect(result.message).toBe('Test auth not enabled')
  })

  it('does nothing when TEST_AUTH_ENABLED is false', async () => {
    process.env.TEST_AUTH_ENABLED = 'false'

    const result = await testAuthBootstrap()

    expect(result.success).toBe(true)
    expect(result.message).toBe('Test auth not enabled')
  })

  it('fails in production environment', async () => {
    // Override the environment for this test
    const originalEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
    })

    process.env.TEST_AUTH_ENABLED = 'true'
    process.env.TEST_AUTH_EMAIL = 'test@example.com'
    process.env.TEST_AUTH_PASSWORD = 'test-password-123'

    const result = await testAuthBootstrap()

    expect(result.success).toBe(false)
    expect(result.error).toContain('production builds')

    // Restore original NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    })
  })

  it('fails when TEST_AUTH_ENABLED is true but credentials are missing', async () => {
    process.env.TEST_AUTH_ENABLED = 'true'
    delete process.env.TEST_AUTH_EMAIL
    delete process.env.TEST_AUTH_PASSWORD

    const result = await testAuthBootstrap()

    expect(result.success).toBe(false)
    expect(result.error).toContain('TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD')
  })

  it('signs in successfully when credentials are provided', async () => {
    // Get the mocked functions
    const { authClient } = require('@my/api')

    // Explicitly set test environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
    })
    delete process.env.EXPO_PUBLIC_ENV

    process.env.TEST_AUTH_ENABLED = 'true'
    process.env.TEST_AUTH_EMAIL = 'test@example.com'
    process.env.TEST_AUTH_PASSWORD = 'test-password-123'

    jest.mocked(authClient.getCurrentUserId).mockResolvedValue(null) // No existing session
    jest.mocked(authClient.signInWithPassword).mockResolvedValue({
      success: true,
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'token' },
      },
    })

    const result = await testAuthBootstrap()

    // If test fails, let's see what the actual result is
    if (!result.success) {
      throw new Error(`Test auth bootstrap failed: ${result.error}`)
    }

    expect(result.success).toBe(true)
    expect(result.message).toBe('Test auth bootstrap completed successfully')
    expect(authClient.signInWithPassword).toHaveBeenCalledWith(
      'test@example.com',
      'test-password-123'
    )
  })

  it('skips sign in when user is already authenticated', async () => {
    // Get the mocked functions
    const { authClient } = require('@my/api')

    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
    })
    delete process.env.EXPO_PUBLIC_ENV

    process.env.TEST_AUTH_ENABLED = 'true'
    process.env.TEST_AUTH_EMAIL = 'test@example.com'
    process.env.TEST_AUTH_PASSWORD = 'test-password-123'

    jest.mocked(authClient.getCurrentUserId).mockResolvedValue('existing-user-id')

    const result = await testAuthBootstrap()

    expect(result.success).toBe(true)
    expect(result.message).toBe('User already authenticated')
    expect(authClient.signInWithPassword).not.toHaveBeenCalled()
  })

  it('uses singleton pattern - concurrent calls return same promise', async () => {
    // Get the mocked functions
    const { authClient } = require('@my/api')

    // Explicitly set test environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      configurable: true,
    })
    delete process.env.EXPO_PUBLIC_ENV

    process.env.TEST_AUTH_ENABLED = 'true'
    process.env.TEST_AUTH_EMAIL = 'test@example.com'
    process.env.TEST_AUTH_PASSWORD = 'test-password-123'

    // Mock authClient to return null (no existing user), then success
    jest.mocked(authClient.getCurrentUserId).mockResolvedValue(null)
    jest.mocked(authClient.signInWithPassword).mockResolvedValue({
      success: true,
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'token' },
      },
    })

    // Fire 5 concurrent bootstrap calls
    const promises = [
      testAuthBootstrap(),
      testAuthBootstrap(),
      testAuthBootstrap(),
      testAuthBootstrap(),
      testAuthBootstrap(),
    ]

    const results = await Promise.all(promises)

    // All should succeed
    results.forEach((result) => {
      expect(result.success).toBe(true)
    })

    // BUT signInWithPassword should only be called ONCE (singleton pattern)
    expect(authClient.signInWithPassword).toHaveBeenCalledTimes(1)
  })
})
