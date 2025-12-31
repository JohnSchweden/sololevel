/**
 * Supabase Client Storage Integration Tests
 *
 * Verifies that Supabase client uses MMKV storage adapter for auth persistence
 * instead of AsyncStorage for improved performance (~30x faster).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @my/config storage before importing supabase
vi.mock('@my/config', () => {
  const store = new Map<string, string>()
  const mockMmkv = {
    getString: vi.fn((key: string) => store.get(key)),
    set: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    delete: vi.fn((key: string) => {
      store.delete(key)
    }),
    contains: vi.fn((key: string) => store.has(key)),
    clearAll: vi.fn(() => {
      store.clear()
    }),
  }
  return {
    mmkv: mockMmkv,
    getMmkvInstance: vi.fn(() => mockMmkv),
    mmkvStorageAsync: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value)
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key)
      }),
    },
  }
})

// Mock @supabase/supabase-js to capture storage config
const mockCreateClient = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

describe('Supabase Client - MMKV Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module cache to force re-import with fresh mocks
    vi.resetModules()
  })

  it('should use mmkvStorageAsync for auth storage on native platforms', async () => {
    // ARRANGE: Mock react-native Platform to simulate native environment
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }))

    // Mock environment variables
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key'

    // Setup mock client return
    mockCreateClient.mockReturnValue({
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    })

    // ACT: Import supabase client (triggers initialization)
    const { supabase } = await import('./supabase')

    // Access a property to trigger lazy client creation
    void supabase.auth

    // ASSERT: Verify createClient was called with mmkvStorageAsync
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    const [url, key, config] = mockCreateClient.mock.calls[0]

    expect(url).toBe('http://127.0.0.1:54321')
    expect(key).toBe('test-key')
    expect(config.auth).toBeDefined()
    expect(config.auth.storage).toBeDefined()
    expect(config.auth.storageKey).toBe('supabase.auth.token')

    // Verify storage has async methods (mmkvStorageAsync signature)
    expect(typeof config.auth.storage.getItem).toBe('function')
    expect(typeof config.auth.storage.setItem).toBe('function')
    expect(typeof config.auth.storage.removeItem).toBe('function')

    // Verify storage operations work
    await config.auth.storage.setItem('test-key', 'test-value')
    const value = await config.auth.storage.getItem('test-key')
    expect(value).toBe('test-value')
  })

  it('should NOT use AsyncStorage adapter', async () => {
    // ARRANGE: Mock react-native Platform
    vi.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }))

    // Mock AsyncStorage (should NOT be used)
    const mockAsyncStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    vi.doMock('@react-native-async-storage/async-storage', () => ({
      default: mockAsyncStorage,
    }))

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key'

    mockCreateClient.mockReturnValue({
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    })

    // ACT: Import and access client
    const { supabase } = await import('./supabase')
    void supabase.auth

    // ASSERT: Verify AsyncStorage was NOT passed to createClient
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    const [, , config] = mockCreateClient.mock.calls[0]

    // Storage should NOT be AsyncStorage instance
    expect(config.auth.storage).not.toBe(mockAsyncStorage)

    // Verify AsyncStorage methods were never called
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled()
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled()
    expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled()
  })

  it('should pass mmkvStorageAsync on all platforms (graceful degradation)', async () => {
    // ARRANGE: Mock web environment (no react-native Platform)
    vi.doMock('react-native', () => {
      throw new Error('react-native not available on web')
    })

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key'

    mockCreateClient.mockReturnValue({
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    })

    // ACT: Import and access client
    const { supabase } = await import('./supabase')
    void supabase.auth

    // ASSERT: Verify createClient called with mmkvStorageAsync
    // On web, mmkvStorageAsync methods return null (graceful degradation)
    // Supabase will automatically fall back to localStorage
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    const [, , config] = mockCreateClient.mock.calls[0]

    // Storage should always be mmkvStorageAsync (defined on all platforms)
    expect(config.auth.storage).toBeDefined()
    expect(typeof config.auth.storage.getItem).toBe('function')
    expect(typeof config.auth.storage.setItem).toBe('function')
    expect(typeof config.auth.storage.removeItem).toBe('function')
  })
})
