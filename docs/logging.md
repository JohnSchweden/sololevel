# Logging Guidelines

## Overview

This guide establishes standards for logging across the SoloLevel application. Proper logging improves debugging, monitoring, and maintenance while avoiding performance issues and security risks.

## Log Format

All logs follow a structured format:

```
[2025-10-03T14:54:30.537Z] [LEVEL] [Scope] message — key1=value1 key2=value2
```

### Components

- **Timestamp**: ISO 8601 format with milliseconds
- **Level**: `🐛 DBG`, `ℹ INFO`, `⚠ WARN`, `⛔ ERR`
- **Scope**: Component/service identifier (e.g., `VideoAnalysis`, `Auth`, `HTTP`)
- **Message**: Human-readable action or event description
- **Context**: Key-value pairs with standardized keys

### Examples

```typescript
// ✅ Good
log.info('VideoAnalysis', 'recording started', { jobId: 'abc123', userId: 'user_456' })
log.error('Auth', 'login failed', { error: 'Invalid credentials', errorCode: 'INVALID_GRANT' })
log.debug('CameraPreview', 'orientation changed', { orientation: 'landscape' })

// Output:
[2025-10-03T14:54:30.537Z] [ℹ INFO] [VideoAnalysis] recording started — jobId=abc123 userId=user_456
[2025-10-03T14:54:30.537Z] [⛔ ERR] [Auth] login failed — error=Invalid credentials errorCode=INVALID_GRANT
[2025-10-03T14:54:30.537Z] [🐛 DBG] [CameraPreview] orientation changed — orientation=landscape
```

## When to Log

### ✅ DO Log

**Critical User Actions:**
- Authentication events (login, logout, signup)
- Video operations (start/stop recording, upload, analysis)
- Payment transactions
- Error states that affect user experience

**System Events:**
- Service initialization/failures
- Network request failures
- Database errors
- Unexpected state transitions

**Business Logic:**
- Feature usage metrics
- Performance bottlenecks
- Security events (rate limiting, suspicious activity)

### ❌ DON'T Log

**UI Interactions:**
- Button clicks/presses (unless they trigger business logic)
- Navigation events
- Component renders/mounts
- Form field changes

**Verbose Debug Info:**
- Component lifecycle events
- Internal state changes
- Loop iterations
- Function entry/exit (unless critical)

**Sensitive Data:**
- Passwords, tokens, keys (automatically redacted)
- Full request/response bodies
- Internal system identifiers

## Log Levels

### DEBUG (`log.debug()`)
- **Environment**: Development only (gated with `__DEV__`)
- **Purpose**: Detailed debugging information
- **Examples**:
  - Component state changes
  - API request/response details
  - Performance measurements
  - Development workflow events

### INFO (`log.info()`)
- **Environment**: Production (allowlisted) + Development
- **Purpose**: Important business events and state changes
- **Production Allowlist**:
  - `user signed in/out`
  - `recording/analysis started/completed/failed`
  - `upload started/completed/failed`
  - `network error`, `api error`, `service unavailable`
  - `app launched/backgrounded/foregrounded`

### WARN (`log.warn()`)
- **Environment**: Always logged
- **Purpose**: Potential issues that don't break functionality
- **Examples**:
  - Deprecated API usage
  - Rate limiting warnings
  - Recovery from transient errors

### ERROR (`log.error()`)
- **Environment**: Always logged
- **Purpose**: Failures that affect functionality
- **Examples**:
  - Authentication failures
  - Network/API errors
  - Data corruption
  - Unexpected exceptions

## Context Keys

Use standardized keys for consistent logging and easier querying:

### User & Session
```typescript
{
  userId: 'user_123',        // User identifier
  sessionId: 'sess_456',     // Session identifier
}
```

### Request Tracing
```typescript
{
  requestId: 'req_789',      // Request correlation ID
  jobId: 'job_101',          // Background job ID
  recordingId: 'rec_202',    // Video recording ID
  analysisId: 'ana_303',     // Analysis job ID
}
```

### Performance
```typescript
{
  duration: 1500,            // Duration in milliseconds
  dur: 1.5,                  // Duration in seconds (alternative)
  size: 2048000,             // Size in bytes
}
```

### Status & Errors
```typescript
{
  status: 'completed',       // Operation status
  error: 'Invalid input',    // Error message
  errorCode: 'VALIDATION_ERROR', // Error code
}
```

### Common Fields
```typescript
{
  component: 'VideoPlayer',  // Component name
  action: 'seek',           // Action performed
  method: 'POST',           // HTTP method
  url: '/api/upload',       // URL/endpoint
  type: 'mp4',              // File/content type
  name: 'video.mp4',        // File/object name
  path: '/tmp/video.mp4',   // File path
  width: 1920,              // Dimensions
  height: 1080,
}
```

## PII Protection

The logger automatically redacts sensitive information:

### Automatic Redaction
- **Emails**: `user@example.com` → `[redacted-email]`
- **Phone numbers**: `+1234567890` → `[redacted-phone]`
- **API tokens**: `Bearer abc123` → `[redacted-token]`
- **UUIDs**: `12345678-abcd-...` → `12345678…` (first 8 chars only)

### Manual Protection
```typescript
// ✅ Safe logging
log.info('User', 'profile updated', {
  userId: user.id,
  // Don't log: email, phone, fullName
  hasEmail: !!user.email,
  hasPhone: !!user.phone,
})

// ❌ Unsafe (automatically redacted, but avoid entirely)
log.info('User', 'login attempt', {
  email: user.email,  // Will be redacted to [redacted-email]
})
```

## Best Practices

### Performance
- **Lazy Evaluation**: Logs are only formatted when actually needed
- **Development Gating**: Debug logs don't impact production performance
- **Buffer Limits**: Automatic cleanup prevents memory leaks

### Consistency
- **Standard Scopes**: Use component/service names (e.g., `Auth`, `VideoAnalysis`, `HTTP`)
- **Action-Oriented Messages**: Describe what happened, not what will happen
- **Context First**: Include relevant IDs and metadata for correlation

### Maintenance
- **Audit Regularly**: Use `scripts/ops/audit-logs.mjs` to review logging
- **Remove Debug Logs**: Clean up temporary debug logs after fixing issues
- **Test Logging**: Verify log calls work in both dev and production environments

## Migration Guide

### From Old Format
```typescript
// ❌ Old
log.info('User logged in successfully')
log.error('Failed to upload video', { error: err })

// ✅ New
log.info('Auth', 'user logged in', { userId: user.id })
log.error('Upload', 'video upload failed', { error: err.message, jobId: job.id })
```

### From Console.log
```typescript
// ❌ Avoid
console.log('Debug info:', data)

// ✅ Use logger
log.debug('Component', 'debug info', { data })
```

## Tools

### Audit Script
```bash
# Find noisy logs
node scripts/ops/audit-logs.mjs

# Focus on specific patterns
grep -r "log\.info.*clicked" packages/ apps/
```

### Error Inspection
```typescript
// Get recent errors (for debugging)
import { getRecentErrors } from '@ui/components/ErrorBoundary'
const errors = getRecentErrors()
console.log('Recent errors:', errors)
```

## Emergency Overrides

In production emergencies, you can temporarily increase logging:

```typescript
// Temporarily enable more logging (use sparingly)
if (process.env.LOG_LEVEL === 'debug') {
  // Enable additional debug logs
}
```

## Related Documentation

- [Error Handling](../quality/error-handling.mdc)
- [Performance Monitoring](../quality/performance-monitoring.mdc)
- [Security Best Practices](../quality/security-best-practices.mdc)
