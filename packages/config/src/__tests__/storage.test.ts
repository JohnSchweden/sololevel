/**
 * Tests for MMKV Storage Adapters
 *
 * Validates that all storage adapters conform to their interfaces and
 * provide correct behavior for Zustand, Supabase, and direct usage.
 */

import { mmkvDirect, mmkvStorage, mmkvStorageAsync } from '../storage'
import { clearMockStore } from './__mocks__/react-native-mmkv'

// Reset module cache and store before each test to ensure fresh state
beforeEach(() => {
  jest.resetModules()
  clearMockStore()
  // Re-import storage module to get fresh MMKV instance
  delete require.cache[require.resolve('../storage')]
})

describe('MMKV Storage Adapters', () => {
  describe('mmkvStorage (Zustand StateStorage)', () => {
    it('should conform to StateStorage interface', () => {
      // 🧪 ARRANGE: Check interface compliance
      expect(typeof mmkvStorage.getItem).toBe('function')
      expect(typeof mmkvStorage.setItem).toBe('function')
      expect(typeof mmkvStorage.removeItem).toBe('function')
    })

    it('should store and retrieve string values', () => {
      // 🧪 ARRANGE: Set up test data
      const key = 'test-key'
      const value = 'test-value'

      // 🎬 ACT: Store and retrieve
      mmkvStorage.setItem(key, value)
      const retrieved = mmkvStorage.getItem(key)

      // ✅ ASSERT: Value should be stored and retrieved correctly
      expect(retrieved).toBe(value)
    })

    it('should return null for non-existent keys', () => {
      // 🎬 ACT: Try to get non-existent key
      const retrieved = mmkvStorage.getItem('non-existent-key')

      // ✅ ASSERT: Should return null (not undefined)
      expect(retrieved).toBeNull()
    })

    it('should remove items correctly', () => {
      // 🧪 ARRANGE: Store a value
      const key = 'test-key'
      const value = 'test-value'
      mmkvStorage.setItem(key, value)

      // 🎬 ACT: Remove the item
      mmkvStorage.removeItem(key)

      // ✅ ASSERT: Item should be removed
      expect(mmkvStorage.getItem(key)).toBeNull()
    })

    it('should handle multiple operations', () => {
      // 🧪 ARRANGE: Multiple keys
      const key1 = 'key1'
      const key2 = 'key2'
      const value1 = 'value1'
      const value2 = 'value2'

      // 🎬 ACT: Store multiple values
      mmkvStorage.setItem(key1, value1)
      mmkvStorage.setItem(key2, value2)

      // ✅ ASSERT: Both values should be stored independently
      expect(mmkvStorage.getItem(key1)).toBe(value1)
      expect(mmkvStorage.getItem(key2)).toBe(value2)

      // 🎬 ACT: Remove one key
      mmkvStorage.removeItem(key1)

      // ✅ ASSERT: Only removed key should be gone
      expect(mmkvStorage.getItem(key1)).toBeNull()
      expect(mmkvStorage.getItem(key2)).toBe(value2)
    })
  })

  describe('mmkvStorageAsync (Supabase async API)', () => {
    it('should provide Promise-based API', async () => {
      // 🧪 ARRANGE: Check interface compliance
      expect(typeof mmkvStorageAsync.getItem).toBe('function')
      expect(typeof mmkvStorageAsync.setItem).toBe('function')
      expect(typeof mmkvStorageAsync.removeItem).toBe('function')

      // ✅ ASSERT: Methods should return Promises
      const getPromise = mmkvStorageAsync.getItem('test')
      expect(getPromise).toBeInstanceOf(Promise)
    })

    it('should store and retrieve values asynchronously', async () => {
      // 🧪 ARRANGE: Set up test data
      const key = 'async-test-key'
      const value = 'async-test-value'

      // 🎬 ACT: Store and retrieve
      await mmkvStorageAsync.setItem(key, value)
      const retrieved = await mmkvStorageAsync.getItem(key)

      // ✅ ASSERT: Value should be stored and retrieved correctly
      expect(retrieved).toBe(value)
    })

    it('should return null for non-existent keys', async () => {
      // 🎬 ACT: Try to get non-existent key
      const retrieved = await mmkvStorageAsync.getItem('non-existent-key')

      // ✅ ASSERT: Should return null
      expect(retrieved).toBeNull()
    })

    it('should remove items correctly', async () => {
      // 🧪 ARRANGE: Store a value
      const key = 'async-remove-key'
      const value = 'async-remove-value'
      await mmkvStorageAsync.setItem(key, value)

      // 🎬 ACT: Remove the item
      await mmkvStorageAsync.removeItem(key)

      // ✅ ASSERT: Item should be removed
      const retrieved = await mmkvStorageAsync.getItem(key)
      expect(retrieved).toBeNull()
    })
  })

  describe('mmkvDirect (synchronous direct API)', () => {
    it('should provide synchronous API', () => {
      // 🧪 ARRANGE: Check interface compliance
      expect(typeof mmkvDirect.getString).toBe('function')
      expect(typeof mmkvDirect.setString).toBe('function')
      expect(typeof mmkvDirect.delete).toBe('function')
      expect(typeof mmkvDirect.contains).toBe('function')
      expect(typeof mmkvDirect.clearAll).toBe('function')
    })

    it('should store and retrieve string values synchronously', () => {
      // 🧪 ARRANGE: Set up test data
      const key = 'direct-test-key'
      const value = 'direct-test-value'

      // 🎬 ACT: Store and retrieve
      mmkvDirect.setString(key, value)
      const retrieved = mmkvDirect.getString(key)

      // ✅ ASSERT: Value should be stored and retrieved correctly
      expect(retrieved).toBe(value)
    })

    it('should return null for non-existent keys', () => {
      // 🎬 ACT: Try to get non-existent key
      const retrieved = mmkvDirect.getString('non-existent-key')

      // ✅ ASSERT: Should return null
      expect(retrieved).toBeNull()
    })

    it('should check if key exists', () => {
      // 🧪 ARRANGE: Store a value
      const key = 'exists-test-key'
      const value = 'exists-test-value'

      // ✅ ASSERT: Key should not exist initially
      expect(mmkvDirect.contains(key)).toBe(false)

      // 🎬 ACT: Store value
      mmkvDirect.setString(key, value)

      // ✅ ASSERT: Key should exist after storing
      expect(mmkvDirect.contains(key)).toBe(true)
    })

    it('should delete keys correctly', () => {
      // 🧪 ARRANGE: Store a value
      const key = 'delete-test-key'
      const value = 'delete-test-value'
      mmkvDirect.setString(key, value)

      // ✅ ASSERT: Key should exist
      expect(mmkvDirect.contains(key)).toBe(true)

      // 🎬 ACT: Delete the key
      mmkvDirect.delete(key)

      // ✅ ASSERT: Key should be removed
      expect(mmkvDirect.contains(key)).toBe(false)
      expect(mmkvDirect.getString(key)).toBeNull()
    })

    it('should clear all storage', () => {
      // 🧪 ARRANGE: Store multiple values
      mmkvDirect.setString('key1', 'value1')
      mmkvDirect.setString('key2', 'value2')
      mmkvDirect.setString('key3', 'value3')

      // ✅ ASSERT: All keys should exist
      expect(mmkvDirect.contains('key1')).toBe(true)
      expect(mmkvDirect.contains('key2')).toBe(true)
      expect(mmkvDirect.contains('key3')).toBe(true)

      // 🎬 ACT: Clear all storage
      mmkvDirect.clearAll()

      // ✅ ASSERT: All keys should be removed
      expect(mmkvDirect.contains('key1')).toBe(false)
      expect(mmkvDirect.contains('key2')).toBe(false)
      expect(mmkvDirect.contains('key3')).toBe(false)
    })

    it('should handle empty string values', () => {
      // 🧪 ARRANGE: Store empty string
      const key = 'empty-string-key'
      const value = ''

      // 🎬 ACT: Store and retrieve
      mmkvDirect.setString(key, value)
      const retrieved = mmkvDirect.getString(key)

      // ✅ ASSERT: Empty string should be stored correctly
      expect(retrieved).toBe('')
      expect(mmkvDirect.contains(key)).toBe(true)
    })

    it('should handle long string values', () => {
      // 🧪 ARRANGE: Store long string
      const key = 'long-string-key'
      const value = 'a'.repeat(10000)

      // 🎬 ACT: Store and retrieve
      mmkvDirect.setString(key, value)
      const retrieved = mmkvDirect.getString(key)

      // ✅ ASSERT: Long string should be stored correctly
      expect(retrieved).toBe(value)
      expect(retrieved?.length).toBe(10000)
    })
  })

  describe('Cross-adapter compatibility', () => {
    it('should allow data written via mmkvStorage to be read via mmkvDirect', () => {
      // 🧪 ARRANGE: Write via Zustand adapter
      const key = 'cross-adapter-key'
      const value = 'cross-adapter-value'
      mmkvStorage.setItem(key, value)

      // 🎬 ACT: Read via direct adapter
      const retrieved = mmkvDirect.getString(key)

      // ✅ ASSERT: Should be readable across adapters
      expect(retrieved).toBe(value)
    })

    it('should allow data written via mmkvDirect to be read via mmkvStorage', () => {
      // 🧪 ARRANGE: Write via direct adapter
      const key = 'cross-adapter-key-2'
      const value = 'cross-adapter-value-2'
      mmkvDirect.setString(key, value)

      // 🎬 ACT: Read via Zustand adapter
      const retrieved = mmkvStorage.getItem(key)

      // ✅ ASSERT: Should be readable across adapters
      expect(retrieved).toBe(value)
    })

    it('should allow data written via mmkvStorageAsync to be read via mmkvDirect', async () => {
      // 🧪 ARRANGE: Write via async adapter
      const key = 'cross-adapter-async-key'
      const value = 'cross-adapter-async-value'
      await mmkvStorageAsync.setItem(key, value)

      // 🎬 ACT: Read via direct adapter
      const retrieved = mmkvDirect.getString(key)

      // ✅ ASSERT: Should be readable across adapters
      expect(retrieved).toBe(value)
    })
  })
})
