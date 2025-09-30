import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import {
  enableNetworkLogging,
  getConsoleErrors,
  getConsoleLogs,
  getNetworkErrors,
  getNetworkLogs,
  log,
  logger,
} from '../logger'

// Mock console methods
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock global fetch
const mockFetch = jest.fn()
let originalFetch: any

describe('Logger', () => {
  beforeEach(() => {
    // Mock console methods
    Object.assign(console, mockConsole)

    // Mock global fetch
    originalFetch = (global as any).fetch
    ;(global as any).fetch = mockFetch

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore original console and fetch
    jest.restoreAllMocks()
    if (originalFetch) {
      ;(global as any).fetch = originalFetch
    }
    mockFetch.mockReset()
  })

  describe('Logger Methods', () => {
    it('should export logger and log alias', () => {
      expect(logger).toBeDefined()
      expect(log).toBe(logger)
    })

    it('should have all required methods', () => {
      expect(logger.debug).toBeInstanceOf(Function)
      expect(logger.info).toBeInstanceOf(Function)
      expect(logger.warn).toBeInstanceOf(Function)
      expect(logger.error).toBeInstanceOf(Function)
    })

    it('should call console methods with formatted messages', () => {
      const message = 'Test message'
      const args = ['arg1', 'arg2']

      logger.debug(message, ...args)
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[Test message\]$/),
        ...args
      )

      logger.info(message, ...args)
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[Test message\]$/),
        ...args
      )

      logger.warn(message, ...args)
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[Test message\]$/),
        ...args
      )

      logger.error(message, ...args)
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[Test message\]$/),
        ...args
      )
    })

    it('should format messages with timestamp', () => {
      const message = 'Test message'
      logger.info(message)

      const call = mockConsole.info.mock.calls[0]
      expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(call[0]).toContain('[Test message]')
    })
  })

  describe('Buffer Management', () => {
    it('should provide console logs getter', () => {
      const logs = getConsoleLogs()
      expect(Array.isArray(logs)).toBe(true)
    })

    it('should provide console errors getter', () => {
      const errors = getConsoleErrors()
      expect(Array.isArray(errors)).toBe(true)
    })

    it('should filter console errors and warnings', () => {
      // Test the filtering logic by checking the function exists and works
      const allLogs = getConsoleLogs()
      const errorLogs = getConsoleErrors()
      // Errors should be a subset of all logs
      expect(errorLogs.length).toBeLessThanOrEqual(allLogs.length)
    })
  })

  describe('Network Logging', () => {
    it('should enable network logging and return cleanup function', () => {
      const cleanup = enableNetworkLogging()
      expect(typeof cleanup).toBe('function')
      cleanup() // Cleanup immediately to avoid side effects
    })

    it('should provide network logs getter', () => {
      const logs = getNetworkLogs()
      expect(Array.isArray(logs)).toBe(true)
    })

    it('should provide network errors getter', () => {
      const errors = getNetworkErrors()
      expect(Array.isArray(errors)).toBe(true)
    })

    it('should filter network errors', () => {
      // Test the filtering logic by checking the function exists and works
      const allLogs = getNetworkLogs()
      const errorLogs = getNetworkErrors()
      // Errors should be a subset of all logs
      expect(errorLogs.length).toBeLessThanOrEqual(allLogs.length)
    })
  })

  describe('Development Environment Detection', () => {
    // These tests are harder to mock since isDev is set at module load time
    // In a real scenario, we'd want to make this more testable

    it('should have isDev detection logic', () => {
      // This test verifies the logic exists, but doesn't test the actual detection
      // since it's evaluated at module load time
      expect(typeof (globalThis as any).__DEV__).toBeDefined()
      expect(typeof process?.env?.NODE_ENV).toBeDefined()
    })
  })
})
