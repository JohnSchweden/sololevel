import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClientFromEnv } from './client.ts'

// Deno global is already available in Deno runtime

// Mock createClient
// @ts-ignore - JSR import for Deno runtime
vi.mock('jsr:@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({ mockClient: true }))
}))

describe('createServiceClientFromEnv', () => {
  const originalDeno = (globalThis as any).Deno

  beforeEach(() => {
    // Reset Deno mock before each test
    ;(globalThis as any).Deno = {
      env: {
        get: vi.fn()
      }
    }
  })

  afterEach(() => {
    // Restore original Deno
    ;(globalThis as any).Deno = originalDeno
  })

  it('should create client with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key'
      return undefined
    })

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toEqual({ mockClient: true })
    expect(logger.info).toHaveBeenCalledWith('Supabase client initialized', {
      hasSupabaseClient: true,
      hasSupabaseUrl: true,
      hasServiceKey: true
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('should use EDGE_SUPABASE_URL fallback when SUPABASE_URL not set', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'EDGE_SUPABASE_URL') return 'https://edge-test.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key'
      return undefined
    })

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toEqual({ mockClient: true })
    expect(logger.info).toHaveBeenCalled()
  })

  it('should use EDGE_SUPABASE_SERVICE_ROLE_KEY fallback when SUPABASE_SERVICE_ROLE_KEY not set', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
      if (key === 'EDGE_SUPABASE_SERVICE_ROLE_KEY') return 'edge-service-key'
      return undefined
    })

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toEqual({ mockClient: true })
    expect(logger.info).toHaveBeenCalled()
  })

  it('should prefer SUPABASE_URL over EDGE_SUPABASE_URL', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://primary.supabase.co'
      if (key === 'EDGE_SUPABASE_URL') return 'https://edge.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key'
      return undefined
    })

    const result = createServiceClientFromEnv()
    expect(result).toEqual({ mockClient: true })
  })

  it('should prefer SUPABASE_SERVICE_ROLE_KEY over EDGE_SUPABASE_SERVICE_ROLE_KEY', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'primary-service-key'
      if (key === 'EDGE_SUPABASE_SERVICE_ROLE_KEY') return 'edge-service-key'
      return undefined
    })

    const result = createServiceClientFromEnv()
    expect(result).toEqual({ mockClient: true })
  })

  it('should return null when SUPABASE_URL is missing', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key'
      return undefined
    })

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith('Missing required environment variables for Supabase client', {
      hasSupabaseUrl: false,
      hasServiceKey: true,
    })
    expect(logger.error).toHaveBeenCalledWith('Supabase client not available')
  })

  it('should return null when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
      return undefined
    })

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith('Missing required environment variables for Supabase client', {
      hasSupabaseUrl: true,
      hasServiceKey: false,
    })
    expect(logger.error).toHaveBeenCalledWith('Supabase client not available')
  })

  it('should return null when both environment variables are missing', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockReturnValue(undefined)

    const logger = { info: vi.fn(), error: vi.fn() }
    const result = createServiceClientFromEnv(logger)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith('Missing required environment variables for Supabase client', {
      hasSupabaseUrl: false,
      hasServiceKey: false,
    })
    expect(logger.error).toHaveBeenCalledWith('Supabase client not available')
  })

  it('should work without logger parameter', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key'
      return undefined
    })

    const result = createServiceClientFromEnv()
    expect(result).toEqual({ mockClient: true })
  })

  it('should handle logger methods gracefully when not provided', () => {
    const mockEnv = (globalThis as any).Deno.env
    mockEnv.get.mockReturnValue(undefined)

    // Should not throw when calling logger methods on undefined logger
    expect(() => createServiceClientFromEnv()).not.toThrow()
  })
})
