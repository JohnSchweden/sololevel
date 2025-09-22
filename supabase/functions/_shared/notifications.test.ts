import { describe, expect, it, vi } from 'vitest'
import { notifyAnalysisComplete } from './notifications.ts'

describe('notifyAnalysisComplete', () => {
  it('should log completion message when logger is provided', () => {
    const logger = { info: vi.fn() }

    notifyAnalysisComplete(123, logger)

    expect(logger.info).toHaveBeenCalledWith('Analysis 123 completed - notification sent')
  })

  it('should handle missing logger gracefully', () => {
    // Should not throw when no logger is provided
    expect(() => notifyAnalysisComplete(456)).not.toThrow()
  })

  it('should handle different analysis IDs', () => {
    const logger = { info: vi.fn() }

    notifyAnalysisComplete(789, logger)

    expect(logger.info).toHaveBeenCalledWith('Analysis 789 completed - notification sent')
  })

  it('should handle zero analysis ID', () => {
    const logger = { info: vi.fn() }

    notifyAnalysisComplete(0, logger)

    expect(logger.info).toHaveBeenCalledWith('Analysis 0 completed - notification sent')
  })

  it('should handle negative analysis IDs', () => {
    const logger = { info: vi.fn() }

    notifyAnalysisComplete(-1, logger)

    expect(logger.info).toHaveBeenCalledWith('Analysis -1 completed - notification sent')
  })

  it('should return void (no return value)', () => {
    const result = notifyAnalysisComplete(123)
    expect(result).toBeUndefined()
  })
})
