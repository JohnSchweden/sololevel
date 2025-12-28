/**
 * Mock for react-native-mmkv
 * Provides in-memory storage for testing
 */

const store = new Map<string, string>()

export const MMKV = jest.fn().mockImplementation(() => ({
  getString: jest.fn((key: string) => store.get(key) ?? undefined),
  set: jest.fn((key: string, value: string | number | boolean) => {
    store.set(key, String(value))
  }),
  delete: jest.fn((key: string) => store.delete(key)),
  contains: jest.fn((key: string) => store.has(key)),
  clearAll: jest.fn(() => store.clear()),
}))

// Export a function to clear the store between tests
export function clearMockStore(): void {
  store.clear()
}
