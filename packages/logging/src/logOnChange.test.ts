/**
 * Tests for logOnChange functionality
 */

import * as loggerModule from './logger'

// Spy on logger methods
const loggerSpy = {
  debug: jest.spyOn(loggerModule.logger, 'debug').mockImplementation(() => {}),
  info: jest.spyOn(loggerModule.logger, 'info').mockImplementation(() => {}),
  warn: jest.spyOn(loggerModule.logger, 'warn').mockImplementation(() => {}),
  error: jest.spyOn(loggerModule.logger, 'error').mockImplementation(() => {}),
}

const { logOnChange, clearChangeCache } = loggerModule

describe('logOnChange', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearChangeCache()
  })

  it('should not log on first call by default', () => {
    logOnChange('test-key', { count: 1 }, 'TestScope', 'State changed')

    expect(loggerSpy.debug).not.toHaveBeenCalled()
  })

  it('should log on first call when initialLog is true', () => {
    logOnChange('test-key', { count: 1 }, 'TestScope', 'State changed', { initialLog: true })

    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State changed (initial)',
      expect.objectContaining({ count: 1 })
    )
  })

  it('should log only when state changes', () => {
    // First call - no log
    logOnChange('test-key', { count: 1 }, 'TestScope', 'Count changed')
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    // Same value - no log
    logOnChange('test-key', { count: 1 }, 'TestScope', 'Count changed')
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    // Changed value - should log
    logOnChange('test-key', { count: 2 }, 'TestScope', 'Count changed')
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'Count changed',
      expect.objectContaining({
        count: { prev: 1, next: 2 },
      })
    )
  })

  it('should log diff for multiple changed fields', () => {
    const state1 = { isPlaying: false, isActive: false }
    const state2 = { isPlaying: false, isActive: false }
    const state3 = { isPlaying: true, isActive: true }

    logOnChange('multi-key', state1, 'TestScope', 'State changed')
    logOnChange('multi-key', state2, 'TestScope', 'State changed')
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    logOnChange('multi-key', state3, 'TestScope', 'State changed')
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State changed',
      expect.objectContaining({
        isPlaying: { prev: false, next: true },
        isActive: { prev: false, next: true },
      })
    )
  })

  it('should use custom selector to extract signature', () => {
    interface ComplexState {
      meta: { id: string }
      isPlaying: boolean
      timestamp: number
    }

    const selector = (s: ComplexState) => ({
      isPlaying: s.isPlaying,
    })

    const state1: ComplexState = { meta: { id: '1' }, isPlaying: false, timestamp: 100 }
    const state2: ComplexState = { meta: { id: '2' }, isPlaying: false, timestamp: 200 }
    const state3: ComplexState = { meta: { id: '3' }, isPlaying: true, timestamp: 300 }

    logOnChange('selector-key', state1, 'TestScope', 'State changed', { selector })
    logOnChange('selector-key', state2, 'TestScope', 'State changed', { selector })
    // state2 has different meta/timestamp but same isPlaying - no log
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    logOnChange('selector-key', state3, 'TestScope', 'State changed', { selector })
    // state3 has different isPlaying - should log
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State changed',
      expect.objectContaining({
        isPlaying: { prev: false, next: true },
      })
    )
  })

  it('should use custom log level', () => {
    logOnChange('level-key', { count: 1 }, 'TestScope', 'State changed', { level: 'info' })
    logOnChange('level-key', { count: 2 }, 'TestScope', 'State changed', { level: 'info' })

    expect(loggerSpy.info).toHaveBeenCalledWith(
      'TestScope',
      'State changed',
      expect.objectContaining({
        count: { prev: 1, next: 2 },
      })
    )
  })

  it('should include additional context', () => {
    const context = { videoId: 'vid-123', userId: 'user-456' }

    logOnChange('context-key', { count: 1 }, 'TestScope', 'State changed', { context })
    logOnChange('context-key', { count: 2 }, 'TestScope', 'State changed', { context })

    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State changed',
      expect.objectContaining({
        count: { prev: 1, next: 2 },
        videoId: 'vid-123',
        userId: 'user-456',
      })
    )
  })

  it('should use custom comparator', () => {
    // Custom comparator that only considers changes > 10
    const comparator = (prev: Record<string, any>, next: Record<string, any>) => {
      return Math.abs(next.count - prev.count) < 10
    }

    logOnChange('comparator-key', { count: 1 }, 'TestScope', 'State changed', { comparator })

    // Difference is 5 - comparator says they're equal, cache stays at 1
    logOnChange('comparator-key', { count: 6 }, 'TestScope', 'State changed', { comparator })
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    // Difference from cached value (1) is 15 - comparator says they're different
    logOnChange('comparator-key', { count: 16 }, 'TestScope', 'State changed', { comparator })
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State changed',
      expect.objectContaining({
        count: { prev: 1, next: 16 }, // prev is still 1 since 6 was never cached
      })
    )
  })

  it('should handle different keys independently', () => {
    logOnChange('key-a', { value: 1 }, 'TestScope', 'State A changed')
    logOnChange('key-b', { value: 1 }, 'TestScope', 'State B changed')

    logOnChange('key-a', { value: 2 }, 'TestScope', 'State A changed')
    logOnChange('key-b', { value: 1 }, 'TestScope', 'State B changed')

    // Only key-a should have logged
    expect(loggerSpy.debug).toHaveBeenCalledTimes(1)
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'State A changed',
      expect.objectContaining({
        value: { prev: 1, next: 2 },
      })
    )
  })

  it('should handle primitive values', () => {
    logOnChange('primitive-key', 1, 'TestScope', 'Value changed')
    logOnChange('primitive-key', 1, 'TestScope', 'Value changed')
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    logOnChange('primitive-key', 2, 'TestScope', 'Value changed')
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'Value changed',
      expect.objectContaining({
        value: { prev: 1, next: 2 },
      })
    )
  })

  it('should handle string values', () => {
    logOnChange('string-key', 'hello', 'TestScope', 'String changed')
    logOnChange('string-key', 'hello', 'TestScope', 'String changed')
    expect(loggerSpy.debug).not.toHaveBeenCalled()

    logOnChange('string-key', 'world', 'TestScope', 'String changed')
    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'TestScope',
      'String changed',
      expect.objectContaining({
        value: { prev: 'hello', next: 'world' },
      })
    )
  })
})
