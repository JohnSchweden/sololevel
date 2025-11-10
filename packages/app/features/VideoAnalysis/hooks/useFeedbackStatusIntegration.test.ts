import { describe, expect, it, jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'

import {
  normalizeFeedbackCategory,
  useFeedbackStatusIntegration,
} from './useFeedbackStatusIntegration'

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

describe('normalizeFeedbackCategory', () => {
  it('normalizes posture and movement categories regardless of casing', () => {
    expect(normalizeFeedbackCategory('Posture')).toBe('posture')
    expect(normalizeFeedbackCategory('movement')).toBe('movement')
    expect(normalizeFeedbackCategory('Posture & Movement')).toBe('posture')
  })

  it('maps speech-based categories to voice', () => {
    expect(normalizeFeedbackCategory('Speech')).toBe('voice')
    expect(normalizeFeedbackCategory('Vocal Variety')).toBe('voice')
    expect(normalizeFeedbackCategory(' voice ')).toBe('voice')
  })

  it('defaults unknown categories to voice', () => {
    expect(normalizeFeedbackCategory('Confidence')).toBe('voice')
    expect(normalizeFeedbackCategory('')).toBe('voice')
  })
})
