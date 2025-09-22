import { describe, expect, it } from 'vitest'
import { corsHeaders } from './cors.ts'
import { createErrorResponse } from './responses.ts'

describe('createErrorResponse', () => {
  it('should create a Response with the given message and status', () => {
    const message = 'Test error message'
    const status = 400
    const response = createErrorResponse(message, status)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(status)
  })

  it('should include CORS headers in the response', () => {
    const response = createErrorResponse('Test', 500)
    const responseHeaders = response.headers

    // Check that CORS headers are included
    expect(responseHeaders.get('Access-Control-Allow-Origin')).toBe(corsHeaders['Access-Control-Allow-Origin'])
    expect(responseHeaders.get('Access-Control-Allow-Headers')).toBe(corsHeaders['Access-Control-Allow-Headers'])
    expect(responseHeaders.get('Access-Control-Allow-Methods')).toBe(corsHeaders['Access-Control-Allow-Methods'])
    expect(responseHeaders.get('Content-Type')).toBe('application/json')
  })

  it('should format the error message as JSON', async () => {
    const message = 'Custom error message'
    const response = createErrorResponse(message, 404)
    const body = await response.json()

    expect(body).toEqual({ error: message })
  })

  it('should handle different HTTP status codes', () => {
    const testCases = [
      { status: 400, message: 'Bad Request' },
      { status: 404, message: 'Not Found' },
      { status: 500, message: 'Internal Server Error' },
    ]

    testCases.forEach(({ status, message }) => {
      const response = createErrorResponse(message, status)
      expect(response.status).toBe(status)
    })
  })
})
