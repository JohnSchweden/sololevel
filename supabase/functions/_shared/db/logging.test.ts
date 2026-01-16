/**
 * Unit tests for Database Logger
 * Tests child logger functionality for module-specific logging
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabaseLogger } from './logging.ts'

describe('Database Logger - Child Logger', () => {
  let mockSupabase: any
  let mockRpc: any

  beforeEach(() => {
    mockRpc = vi.fn().mockReturnValue({
      then: vi.fn((callback) => {
        callback()
        return { catch: vi.fn() }
      }),
      catch: vi.fn(),
    })

    mockSupabase = {
      rpc: mockRpc,
    }
  })

  it('should create a logger with child() method', () => {
    const logger = createDatabaseLogger('test-function', 'parent-module', mockSupabase, {
      jobId: 123,
    })

    expect(logger).toHaveProperty('child')
    expect(typeof logger.child).toBe('function')
  })

  it('should create child logger with different module name', () => {
    const parentLogger = createDatabaseLogger('test-function', 'parent-module', mockSupabase, {
      jobId: 123,
      analysisId: 'test-analysis-id',
    })

    const childLogger = parentLogger.child('child-module')

    expect(childLogger).toHaveProperty('info')
    expect(childLogger).toHaveProperty('error')
    expect(childLogger).toHaveProperty('warn')
    expect(childLogger).toHaveProperty('debug')
    expect(childLogger).toHaveProperty('child')
  })

  it('should log with child module name in database', () => {
    const parentLogger = createDatabaseLogger('test-function', 'parent-module', mockSupabase, {
      jobId: 123,
    })

    const childLogger = parentLogger.child('child-module')
    childLogger.info('Test message', { data: 'test' })

    expect(mockRpc).toHaveBeenCalledWith(
      'insert_edge_function_log',
      expect.objectContaining({
        p_function_name: 'test-function',
        p_module: 'child-module', // Should use child module name
        p_level: 'info',
        p_message: 'Test message',
        p_job_id: 123,
      })
    )
  })

  it('should preserve context when creating child logger', () => {
    const context = {
      jobId: 456,
      analysisId: 'analysis-123',
      feedbackId: 789,
    }

    const parentLogger = createDatabaseLogger('test-function', 'parent-module', mockSupabase, context)
    const childLogger = parentLogger.child('child-module')

    childLogger.error('Error message', { error: 'test error' })

    expect(mockRpc).toHaveBeenCalledWith(
      'insert_edge_function_log',
      expect.objectContaining({
        p_job_id: 456,
        p_analysis_id: 'analysis-123',
        p_feedback_id: 789,
        p_module: 'child-module',
      })
    )
  })

  it('should allow nested child loggers', () => {
    const parentLogger = createDatabaseLogger('test-function', 'parent', mockSupabase)
    const childLogger = parentLogger.child('child')
    const grandchildLogger = childLogger.child('grandchild')

    grandchildLogger.info('Nested message')

    expect(mockRpc).toHaveBeenCalledWith(
      'insert_edge_function_log',
      expect.objectContaining({
        p_module: 'grandchild',
      })
    )
  })

  it('should log to console with child module name', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const parentLogger = createDatabaseLogger('test-function', 'parent-module', mockSupabase)
    const childLogger = parentLogger.child('child-module')
    childLogger.info('Test message')

    expect(consoleSpy).toHaveBeenCalledWith('[child-module] Test message', '')

    consoleSpy.mockRestore()
  })
})
