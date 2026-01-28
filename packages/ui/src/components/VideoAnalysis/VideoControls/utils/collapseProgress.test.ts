import { isSharedValue, sanitizeCollapseProgress } from './collapseProgress'

describe('sanitizeCollapseProgress', () => {
  it('returns clamped number for valid inputs', () => {
    expect(sanitizeCollapseProgress(0)).toBe(0)
    expect(sanitizeCollapseProgress(0.5)).toBe(0.5)
    expect(sanitizeCollapseProgress(1)).toBe(1)
  })

  it('clamps numbers outside 0-1 range', () => {
    expect(sanitizeCollapseProgress(-0.5)).toBe(0)
    expect(sanitizeCollapseProgress(-10)).toBe(0)
    expect(sanitizeCollapseProgress(1.5)).toBe(1)
    expect(sanitizeCollapseProgress(10)).toBe(1)
  })

  it('handles special number values', () => {
    expect(sanitizeCollapseProgress(Number.NaN)).toBe(0)
    expect(sanitizeCollapseProgress(Number.POSITIVE_INFINITY)).toBe(0)
    expect(sanitizeCollapseProgress(Number.NEGATIVE_INFINITY)).toBe(0)
  })

  it('returns 0 for non-numbers', () => {
    function pass(v) {
      return sanitizeCollapseProgress(v)
    }
    expect(pass('0.5')).toBe(0)
    expect(pass(null)).toBe(0)
    expect(pass(undefined)).toBe(0)
    expect(pass({})).toBe(0)
    expect(pass([])).toBe(0)
    expect(pass(true)).toBe(0)
  })

  it('preserves finite numbers at boundary', () => {
    expect(sanitizeCollapseProgress(0.001)).toBe(0.001)
    expect(sanitizeCollapseProgress(0.999)).toBe(0.999)
    expect(sanitizeCollapseProgress(Number.MIN_VALUE)).toBe(Number.MIN_VALUE)
    expect(sanitizeCollapseProgress(0.999999999999999)).toBeCloseTo(0.999999999999999)
  })

  it('handles negative zero correctly', () => {
    expect(sanitizeCollapseProgress(-0)).toBe(0)
  })
})

describe('isSharedValue', () => {
  it('detects SharedValue objects', () => {
    expect(isSharedValue({ value: 0.5 })).toBe(true)
    expect(isSharedValue({ value: 'max' })).toBe(true)
    expect(isSharedValue({ value: false })).toBe(true)
    expect(isSharedValue({ value: null })).toBe(true)
    expect(isSharedValue({ value: undefined })).toBe(true)
  })

  it('rejects non-SharedValue objects', () => {
    expect(isSharedValue({ value: 0.5, extra: true })).toBe(true) // still has value prop
    expect(isSharedValue({ notValue: 0.5 })).toBe(false)
    expect(isSharedValue({})).toBe(false)
  })

  it('rejects arrays (which have value prop)', () => {
    expect(isSharedValue([])).toBe(false)
    expect(isSharedValue([1, 2, 3])).toBe(false)
  })

  it('rejects non-object types', () => {
    expect(isSharedValue(null)).toBe(false)
    expect(isSharedValue(undefined)).toBe(false)
    expect(isSharedValue(0)).toBe(false)
    expect(isSharedValue(0.5)).toBe(false)
    expect(isSharedValue(true)).toBe(false)
    expect(isSharedValue('string')).toBe(false)
    expect(isSharedValue(Symbol('test'))).toBe(false)
    expect(isSharedValue(123n)).toBe(false)
  })

  it('handles edge cases with value property', () => {
    expect(isSharedValue({ value: {} })).toBe(true)
    expect(isSharedValue({ value: [] })).toBe(true)
    expect(isSharedValue({ value: () => {} })).toBe(true)
    expect(isSharedValue({ value: new Date() })).toBe(true)
    expect(isSharedValue({ value: Symbol('test') })).toBe(true)
  })

  it('does not access .value property during detection', () => {
    // This test ensures the function doesn't cause Reanimated warnings
    // by accessing .value during render phase. We use a getter so that
    // reading .value throws, but 'value' in obj does not invoke it.
    const sharedValue = {
      get value() {
        throw new Error('should not access .value')
      },
    }
    expect(isSharedValue(sharedValue)).toBe(true) // Detection uses 'in', not .value
  })

  it('handles derived SharedValue types', () => {
    expect(isSharedValue({ value: { a: 1, b: 'test' } })).toBe(true)
    expect(isSharedValue({ value: Promise.resolve(42) })).toBe(true)
  })
})
