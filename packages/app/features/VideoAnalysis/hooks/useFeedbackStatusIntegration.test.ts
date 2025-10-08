import { describe, expect, it, jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'

import { useFeedbackStatusIntegration } from './useFeedbackStatusIntegration'

// Mock logging
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('useFeedbackStatusIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns initial state when no analysisId is provided', () => {
    const { result } = renderHook(() => useFeedbackStatusIntegration(undefined))

    expect(result.current.feedbacks).toEqual([])
    expect(result.current.isSubscribed).toBe(false)
  })

  it('returns initial state when empty string analysisId is provided', () => {
    const { result } = renderHook(() => useFeedbackStatusIntegration(''))

    expect(result.current.feedbacks).toEqual([])
    expect(result.current.isSubscribed).toBe(false)
  })
})
