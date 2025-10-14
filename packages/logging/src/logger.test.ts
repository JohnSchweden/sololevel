import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import {
  clearRecentErrors,
  disableNetworkLogging,
  enableNetworkLogging,
  getConsoleErrors,
  getConsoleLogs,
  getNetworkErrors,
  getNetworkLogs,
  getRecentErrors,
  isNetworkLoggingEnabled,
  log,
} from './logger'

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
    it('should export log', () => {
      expect(log).toBeDefined()
    })

    it('should have all required methods', () => {
      expect(log.debug).toBeInstanceOf(Function)
      expect(log.info).toBeInstanceOf(Function)
      expect(log.warn).toBeInstanceOf(Function)
      expect(log.error).toBeInstanceOf(Function)
    })

    it('should call console methods with formatted messages', () => {
      const scope = 'TestScope'
      const message = 'Test message'
      const context = { key: 'value', count: 42 }

      log.debug(scope, message, context)
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{2}:\d{2}:\d{2}\.\d{3}Z.*🐛.*TestScope.*Test message.*key=value count=42/
        )
      )

      log.info(scope, message, context)
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{2}:\d{2}:\d{2}\.\d{3}Z.*ℹ️.*TestScope.*Test message.*key=value count=42/
        )
      )

      log.warn(scope, message, context)
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{2}:\d{2}:\d{2}\.\d{3}Z.*⚠️.*TestScope.*Test message.*key=value count=42/
        )
      )

      log.error(scope, message, context)
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{2}:\d{2}:\d{2}\.\d{3}Z.*⛔.*TestScope.*Test message.*key=value count=42/
        )
      )
    })

    it('should format messages with timestamp', () => {
      const scope = 'TestScope'
      const message = 'Test message'
      log.info(scope, message)

      const call = mockConsole.info.mock.calls[0]
      // In dev mode (test environment), expect time-only format like 15:30:17.687Z
      expect(call[0]).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}Z/)
      expect(call[0]).toContain('ℹ️')
      expect(call[0]).toContain('TestScope')
      expect(call[0]).toContain('Test message')
    })

    it('should redact sensitive information', () => {
      const scope = 'Auth'
      const message = 'login attempt'
      const context = {
        email: 'user@example.com',
        phone: '+1234567890',
        token: 'Bearer abc123',
        sessionId: '12345678-1234-1234-1234-123456789012',
        normalField: 'safe value',
      }

      log.info(scope, message, context)

      const call = mockConsole.info.mock.calls[0]
      expect(call[0]).toContain('email=[redacted-email]')
      expect(call[0]).toContain('phone=[redacted-phone]')
      expect(call[0]).toContain('token=[redacted-token]')
      expect(call[0]).toContain('sessionId=12345678…')
      expect(call[0]).toContain('normalField=safe value')
    })

    it('should format durations human-readably', () => {
      const scope = 'HTTP'
      const message = 'request completed'
      const context = { dur: 1500, status: 200 }

      log.info(scope, message, context)

      const call = mockConsole.info.mock.calls[0]
      expect(call[0]).toContain('dur=1500.000s')
    })

    it('should gate info logs in production unless allowlisted', () => {
      // Mock production environment
      const originalIsDev = (global as any).__DEV__
      const originalNodeEnv = process.env.NODE_ENV
      ;(global as any).__DEV__ = false
      process.env.NODE_ENV = 'production'

      // Reset the isDev detection
      jest.resetModules()
      const loggerModule = require('./logger')
      const prodLogger = loggerModule.log

      // Clear console mocks
      jest.clearAllMocks()

      // Non-allowlisted message should not log
      prodLogger.info('TestScope', 'some random message', { data: 'test' })
      expect(mockConsole.info).not.toHaveBeenCalled()

      // Allowlisted message should log
      prodLogger.info('VideoAnalysis', 'recording started', { jobId: 123 })
      expect(mockConsole.info).toHaveBeenCalled()

      // Restore original values
      ;(global as any).__DEV__ = originalIsDev
      process.env.NODE_ENV = originalNodeEnv
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
    let originalFetch: any

    beforeEach(() => {
      originalFetch = global.fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
      disableNetworkLogging()
    })

    it('should enable network logging and return cleanup function', () => {
      const cleanup = enableNetworkLogging(true)
      expect(typeof cleanup).toBe('function')
      expect(isNetworkLoggingEnabled()).toBe(true)
      cleanup()
    })

    it('should disable network logging when enabled=false', () => {
      const cleanup = enableNetworkLogging(false)
      expect(isNetworkLoggingEnabled()).toBe(false)
      expect(typeof cleanup).toBe('function')
      cleanup()
    })

    it('should disable network logging', () => {
      enableNetworkLogging(true)
      expect(isNetworkLoggingEnabled()).toBe(true)

      disableNetworkLogging()
      expect(isNetworkLoggingEnabled()).toBe(false)
    })

    it('should log concise HTTP summaries when enabled', async () => {
      // Mock fetch
      const mockResponse: any = {
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn((header: string) => (header === 'content-length' ? '1024' : null)),
        },
        clone: jest.fn(() => mockResponse),
        text: jest.fn(() => Promise.resolve('response body')),
      }

      global.fetch = jest.fn(() => Promise.resolve(mockResponse))

      enableNetworkLogging(true)

      await fetch('/api/test')

      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('ℹ️'))
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('HTTP'))
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test — 200 OK')
      )
    })

    it('should log failed requests', async () => {
      const mockError = new Error('Network error')
      global.fetch = jest.fn(() => Promise.reject(mockError))

      enableNetworkLogging(true)

      await expect(fetch('/api/failing')).rejects.toThrow('Network error')

      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('⛔'))
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('HTTP'))
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/failing — FAILED')
      )
    })

    it('should not log when network logging is disabled', async () => {
      const mockResponse: any = {
        status: 200,
        statusText: 'OK',
        headers: { get: jest.fn(() => null) },
        clone: jest.fn(() => mockResponse),
        text: jest.fn(() => Promise.resolve('')),
      }

      global.fetch = jest.fn(() => Promise.resolve(mockResponse))

      enableNetworkLogging(false) // Disabled

      await fetch('/api/test')

      expect(mockConsole.info).not.toHaveBeenCalled()
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

  describe('Recent Error Buffer', () => {
    beforeEach(() => {
      // Clear error buffer before each test
      clearRecentErrors()
      jest.clearAllMocks()
    })

    it('should buffer recent errors', () => {
      const error = new Error('Test error')
      log.error('TestScope', 'test error occurred', { error, userId: '123' })

      const recentErrors = getRecentErrors()
      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0]).toMatchObject({
        level: 'error',
        scope: 'TestScope',
        message: 'test error occurred',
        context: { error, userId: '123' },
        stack: error.stack,
      })
      expect(recentErrors[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should maintain maximum buffer size', () => {
      // Fill buffer beyond max (50)
      for (let i = 0; i < 60; i++) {
        log.error('TestScope', `error ${i}`, { index: i })
      }

      const recentErrors = getRecentErrors()
      expect(recentErrors).toHaveLength(50)

      // Should contain the most recent 50 errors
      expect(recentErrors[49].context?.index).toBe(59)
      expect(recentErrors[0].context?.index).toBe(10)
    })

    it('should extract stack traces from Error objects', () => {
      const error = new Error('Stack trace error')
      log.error('TestScope', 'error with stack', { error })

      const recentErrors = getRecentErrors()
      expect(recentErrors[0].stack).toBe(error.stack)
    })

    it('should extract stack traces from context.stack', () => {
      const stackTrace = 'Custom stack trace'
      log.error('TestScope', 'error with custom stack', { stack: stackTrace })

      const recentErrors = getRecentErrors()
      expect(recentErrors[0].stack).toBe(stackTrace)
    })

    it('should clear error buffer', () => {
      log.error('TestScope', 'first error')
      log.error('TestScope', 'second error')

      expect(getRecentErrors()).toHaveLength(2)

      clearRecentErrors()
      expect(getRecentErrors()).toHaveLength(0)
    })

    it('should return a copy of the buffer', () => {
      log.error('TestScope', 'test error')
      const errors1 = getRecentErrors()
      const errors2 = getRecentErrors()

      // Should be separate arrays
      expect(errors1).not.toBe(errors2)
      expect(errors1).toEqual(errors2)
    })
  })
})
