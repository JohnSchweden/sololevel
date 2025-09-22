import { describe, expect, it } from 'vitest'
import { corsHeaders } from './cors.ts'

describe('corsHeaders', () => {
  it('should contain all required CORS headers', () => {
    expect(corsHeaders).toHaveProperty('Access-Control-Allow-Origin')
    expect(corsHeaders).toHaveProperty('Access-Control-Allow-Headers')
    expect(corsHeaders).toHaveProperty('Access-Control-Allow-Methods')
  })

  it('should allow all origins', () => {
    expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*')
  })

  it('should allow authorization and content-type headers', () => {
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('authorization')
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('content-type')
  })

  it('should allow GET, POST, PUT, DELETE, OPTIONS methods', () => {
    const methods = corsHeaders['Access-Control-Allow-Methods']
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('DELETE')
    expect(methods).toContain('OPTIONS')
  })
})
