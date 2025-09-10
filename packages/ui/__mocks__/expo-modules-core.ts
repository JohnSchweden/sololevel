/// <reference types="jest" />

// Mock createPermissionHook
export const createPermissionHook = jest.fn(() => jest.fn())

// Mock other commonly used exports
export const EventEmitter = jest.fn()
export const NativeModulesProxy = {}
export const Platform = {
  OS: 'web',
  select: jest.fn((obj) => obj.web || obj.default),
}

// Export default
export default {
  createPermissionHook,
  EventEmitter,
  NativeModulesProxy,
  Platform,
}
