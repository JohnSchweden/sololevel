/**
 * Mock for react-native-mmkv v4.x
 * Provides in-memory storage for testing
 *
 * v4.x API: Uses createMMKV() factory function instead of new MMKV() class
 * Matches real MMKV behavior: getString() returns undefined for missing keys
 */

const store = new Map<string, string>()

// Create a shared MMKV instance mock (singleton pattern matches real usage)
let mockInstance: {
  getString: jest.Mock
  set: jest.Mock
  delete: jest.Mock
  contains: jest.Mock
  clearAll: jest.Mock
} | null = null

function getMockInstance() {
  if (!mockInstance) {
    mockInstance = {
      getString: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: string | number | boolean) => {
        store.set(key, String(value))
      }),
      delete: jest.fn((key: string) => store.delete(key)),
      contains: jest.fn((key: string) => store.has(key)),
      clearAll: jest.fn(() => store.clear()),
    }
  }
  return mockInstance
}

// v4.x API: createMMKV factory function (replaces new MMKV() from v3.x)
// Returns singleton instance (matches real MMKV behavior with same id)
export const createMMKV = jest.fn(() => getMockInstance())

// Export a function to clear the store between tests
export function clearMockStore(): void {
  store.clear()
  mockInstance = null
}
