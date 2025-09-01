import { vi } from 'vitest'

// Mock createPermissionHook
export const createPermissionHook = vi.fn(() => vi.fn())

// Mock other commonly used exports
export const EventEmitter = vi.fn()
export const NativeModulesProxy = {}
export const Platform = {
  OS: 'web',
  select: vi.fn((obj) => obj.web || obj.default),
}

// Export default
export default {
  createPermissionHook,
  EventEmitter,
  NativeModulesProxy,
  Platform,
}
