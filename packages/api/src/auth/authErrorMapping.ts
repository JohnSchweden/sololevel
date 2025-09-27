/**
 * Authentication Error Mapping and Structured Logging
 *
 * Maps Supabase authentication errors to user-friendly messages
 * and provides structured logging for authentication events.
 */

import { log } from '@my/logging'
import type { AuthError } from '@supabase/supabase-js'

/**
 * Mapped authentication error with user-friendly message
 */
export interface MappedAuthError {
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Authentication event context for structured logging
 */
export interface AuthEventContext {
  userId?: string
  email?: string
  error?: string
  timestamp?: string
  userAgent?: string
  correlationId?: string
  [key: string]: unknown
}

/**
 * Map Supabase authentication errors to user-friendly messages
 */
export function mapAuthError(error: AuthError): MappedAuthError {
  // Log the original error for debugging
  log.error('Auth Error', {
    message: error.message,
    name: error.name,
    status: error.status,
  })

  // Map common Supabase auth errors to user-friendly messages
  switch (error.message) {
    case 'Invalid login credentials':
    case 'Invalid email or password':
      return {
        message: 'The email or password you entered is incorrect. Please try again.',
        code: 'invalid_credentials',
        severity: 'error',
      }

    case 'Email not confirmed':
    case 'Signup requires email confirmation':
      return {
        message: 'Please check your email and click the confirmation link before signing in.',
        code: 'email_not_confirmed',
        severity: 'warning',
      }

    case 'Too many requests':
    case 'Rate limit exceeded':
      return {
        message: 'Too many sign-in attempts. Please wait a few minutes before trying again.',
        code: 'rate_limit_exceeded',
        severity: 'warning',
      }

    case 'User not found':
      return {
        message:
          'No account found with this email address. Please check your email or create a new account.',
        code: 'user_not_found',
        severity: 'error',
      }

    case 'Password is too weak':
      return {
        message:
          'Password must be at least 8 characters long and contain a mix of letters and numbers.',
        code: 'weak_password',
        severity: 'error',
      }

    case 'Email address is invalid':
      return {
        message: 'Please enter a valid email address.',
        code: 'invalid_email',
        severity: 'error',
      }

    case 'User already registered':
    case 'A user with this email address has already been registered':
      return {
        message: 'An account with this email already exists. Please sign in instead.',
        code: 'user_already_exists',
        severity: 'warning',
      }

    case 'Session expired':
    case 'JWT expired':
      return {
        message: 'Your session has expired. Please sign in again.',
        code: 'session_expired',
        severity: 'warning',
      }

    case 'Network request failed':
    case 'Failed to fetch':
      return {
        message: 'Unable to connect. Please check your internet connection and try again.',
        code: 'network_error',
        severity: 'error',
      }

    case 'Database connection failed':
    case 'Service temporarily unavailable':
      return {
        message: 'Our service is temporarily unavailable. Please try again in a few minutes.',
        code: 'service_unavailable',
        severity: 'error',
      }

    default:
      // For unknown errors, provide a generic message
      return {
        message:
          'Something went wrong. Please try again or contact support if the problem persists.',
        code: 'unknown_error',
        severity: 'error',
      }
  }
}

/**
 * Mask email for privacy in logs (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  if (!domain) return '***'

  const maskedLocal = localPart.length > 2 ? `${localPart.substring(0, 2)}***` : '***'

  return `${maskedLocal}@${domain}`
}

/**
 * Generate correlation ID for tracking auth events
 */
function generateCorrelationId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Log authentication events with structured data
 */
export function logAuthEvent(event: string, context: AuthEventContext = {}): void {
  // Add timestamp if not provided
  const timestamp = context.timestamp || new Date().toISOString()

  // Add correlation ID if not provided
  const correlationId = context.correlationId || generateCorrelationId()

  // Mask email for privacy
  const maskedContext = {
    ...context,
    timestamp,
    correlationId,
    email: context.email ? maskEmail(context.email) : undefined,
  }

  // Remove undefined values
  const cleanContext = Object.fromEntries(
    Object.entries(maskedContext).filter(([_, value]) => value !== undefined)
  )

  log.info(`Auth Event: ${event}`, cleanContext)
}

/**
 * Log authentication success events
 */
export function logAuthSuccess(
  event: 'sign_in' | 'sign_out' | 'sign_up',
  context: AuthEventContext
): void {
  logAuthEvent(`${event}_success`, {
    ...context,
    success: true,
  })
}

/**
 * Log authentication failure events
 */
export function logAuthFailure(
  event: 'sign_in' | 'sign_out' | 'sign_up',
  error: MappedAuthError,
  context: AuthEventContext
): void {
  logAuthEvent(`${event}_failure`, {
    ...context,
    success: false,
    error: error.code,
    errorMessage: error.message,
    severity: error.severity,
  })
}

/**
 * Log authentication attempt events
 */
export function logAuthAttempt(event: 'sign_in' | 'sign_up', context: AuthEventContext): void {
  logAuthEvent(`${event}_attempt`, {
    ...context,
    attempt: true,
  })
}

/**
 * Log session events
 */
export function logSessionEvent(
  event: 'session_restored' | 'session_expired' | 'session_created',
  context: AuthEventContext
): void {
  logAuthEvent(event, context)
}
