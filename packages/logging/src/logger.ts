/**
 * Cross-platform logger (web + Expo Go)
 * Structured output, dev-gated debug, consistent API
 * Integrates with Sentry for production error tracking
 */

// Sentry types (optional - only available in React Native app)
type SentryModule = {
  captureMessage: (message: string, options?: {
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }) => string
  addBreadcrumb: (breadcrumb: {
    category?: string
    message?: string
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
    data?: Record<string, unknown>
    timestamp?: number
  }) => void
}

// Sentry is optional - only available in React Native app
let Sentry: SentryModule | undefined
try {
  // Dynamic import - only available in apps that have @sentry/react-native installed
  Sentry = require('@sentry/react-native') as SentryModule
} catch {
  // Sentry not available (web, tests, or not installed) - gracefully degrade
  Sentry = undefined
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LoggerLike {
  trace: (scope: string, message: string, context?: Record<string, unknown>) => void
  debug: (scope: string, message: string, context?: Record<string, unknown>) => void
  info: (scope: string, message: string, context?: Record<string, unknown>) => void
  warn: (scope: string, message: string, context?: Record<string, unknown>) => void
  error: (scope: string, message: string, context?: Record<string, unknown>) => void
  fatal: (scope: string, message: string, context?: Record<string, unknown>) => void
}

const LEVEL_ICON: Record<LogLevel, string> = {
  trace: '🔍',
  debug: '🐛',
  info: 'ℹ️ ️', 
  warn: '⚠️',
  error: '⛔',
  fatal: '💀',
}

// Production allowlist - critical user actions and state changes that should log in production
const PRODUCTION_INFO_ALLOWLIST = new Set([
  // User authentication
  'user signed in',
  'user signed out',
  'auth error',

  // Video operations
  'recording started',
  'recording completed',
  'recording failed',
  'upload started',
  'upload completed',
  'upload failed',
  'analysis started',
  'analysis completed',
  'analysis failed',

  // Payment operations (if applicable)
  'payment initiated',
  'payment completed',
  'payment failed',

  // Critical errors
  'network error',
  'api error',
  'service unavailable',

  // App lifecycle
  'app launched',
  'app backgrounded',
  'app foregrounded',
])

function isProductionInfoAllowed(scope: string, message: string): boolean {
  const combinedKey = `${scope.toLowerCase()}: ${message.toLowerCase()}`
  return PRODUCTION_INFO_ALLOWLIST.has(message.toLowerCase()) ||
         PRODUCTION_INFO_ALLOWLIST.has(combinedKey)
}

/**
 * Extract issue type from message for Sentry tagging
 * Helps pattern detection and filtering in Sentry dashboard
 */
function extractIssueType(message: string): string {
  const msg = message.toLowerCase()
  
  // Race conditions
  if (msg.includes('race') || msg.includes('concurrent')) return 'race-condition'
  
  // Cache issues
  if (msg.includes('cache miss')) return 'cache-miss'
  if (msg.includes('cache hit')) return 'cache-hit'
  if (msg.includes('cache')) return 'cache-issue'
  
  // Performance
  if (msg.includes('slow') || msg.includes('timeout') || msg.includes('delay')) return 'performance'
  
  // Network
  if (msg.includes('network') || msg.includes('connection')) return 'network'
  
  // State/sync issues
  if (msg.includes('sync') || msg.includes('inconsistent')) return 'sync-issue'
  
  return 'general'
}

// Standardize context keys for consistent logging
export function extractContext(raw: any): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}

  const context: Record<string, unknown> = {}

  // User & Session
  if (raw.userId || raw.user_id) context.userId = raw.userId || raw.user_id
  if (raw.sessionId || raw.session_id) context.sessionId = raw.sessionId || raw.session_id

  // Request tracing
  if (raw.requestId || raw.reqId) context.requestId = raw.requestId || raw.reqId
  if (raw.jobId || raw.job_id || raw.id) context.jobId = raw.jobId || raw.job_id || raw.id
  if (raw.recordingId || raw.recording_id || raw.video_recording_id) {
    context.recordingId = raw.recordingId || raw.recording_id || raw.video_recording_id
  }
  if (raw.analysisId || raw.analysis_id) context.analysisId = raw.analysisId || raw.analysis_id

  // Performance
  if (raw.duration !== undefined) context.duration = raw.duration
  if (raw.dur !== undefined) context.dur = raw.dur

  // Status
  if (raw.status !== undefined) context.status = raw.status

  // Error details
  if (raw.error) context.error = raw.error?.message || raw.error
  if (raw.errorCode || raw.code) context.errorCode = raw.errorCode || raw.code

  // Component/Service
  if (raw.component) context.component = raw.component
  if (raw.action) context.action = raw.action

  // Common fields that should be preserved as-is
  const preserveKeys = ['size', 'type', 'name', 'path', 'uri', 'url', 'method', 'width', 'height']
  preserveKeys.forEach(key => {
    if (raw[key] !== undefined) context[key] = raw[key]
  })

  return context
}

function humanMs(ms?: number): string | undefined {
  if (ms == null || typeof ms !== 'number' || !Number.isFinite(ms)) {
    return undefined
  }
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(3)}s`
}

function humanSeconds(seconds?: number): string | undefined {
  if (seconds == null || typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return undefined
  }
  // // Handle milliseconds (values > 1000 are likely milliseconds)
  // if (seconds > 1000) {
  //   return `${(seconds / 1000).toFixed(2)}s`
  // }
  return `${seconds.toFixed(3)}s`
}

/**
 * Custom replacer for JSON.stringify that avoids accessing SharedValue properties.
 * CRITICAL: Prevents Reanimated warnings when serializing objects containing SharedValues.
 */
function safeStringifyReplacer(_key: string, value: unknown): unknown {
  // Check if value is a SharedValue - don't traverse into it
  // JSON.stringify's replacer is called for every property during traversal
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'value' in value) {
    // Check for Reanimated-specific markers to confirm it's a SharedValue
    if ('_isReanimatedSharedValue' in value || '_value' in value) {
      return '[SharedValue]'
    }
  }
  return value
}

function truncate(value: unknown, max = 120): string {
  // CRITICAL: Check if value is a SharedValue before stringifying
  // JSON.stringify will traverse properties and access .value during render
  if (typeof value === 'object' && value !== null && 'value' in value && !Array.isArray(value)) {
    return 'SharedValue' // Don't access .value during render
  }
  
  const str = typeof value === 'string' ? value : JSON.stringify(value, safeStringifyReplacer)
  if (!str) return ''
  return str.length > max ? `${str.slice(0, max)}…(${str.length})` : str
}

function redact(value: unknown): unknown {
  if (typeof value !== 'string') return value

  // Redact emails
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '[redacted-email]'

  // Redact phone numbers
  if (/^\+?\d{7,}$/.test(value)) return '[redacted-phone]'

  // Redact tokens/keys (common patterns)
  if (/^(sk-|pk_|Bearer\s+|Token\s+)/i.test(value)) return '[redacted-token]'

  // Redact UUIDs that might be sensitive (session IDs, etc.)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
    return value.slice(0, 8) + '…' // Keep first 8 chars
  }

  return value
}

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

function colorizeJson(jsonStr: string): string {
  if (!isDev) return jsonStr // Only colorize in development
  
  return jsonStr
    // Object keys (before colon)
    .replace(/"([^"]+)":/g, `${COLORS.cyan}"$1"${COLORS.reset}:`)
    // String values (green)
    .replace(/: "([^"]+)"/g, `: ${COLORS.green}"$1"${COLORS.reset}`)
    // Numbers (yellow)
    .replace(/: (\d+(?:\.\d+)?)/g, `: ${COLORS.yellow}$1${COLORS.reset}`)
    // Booleans (magenta)
    .replace(/: (true|false)/g, `: ${COLORS.magenta}$1${COLORS.reset}`)
    // null/undefined (gray)
    .replace(/: (null|undefined)/g, `: ${COLORS.gray}$1${COLORS.reset}`)
}

function formatContext(obj?: Record<string, unknown>): string {
  if (!obj || Object.keys(obj).length === 0) return ''

  // For complex objects, use pretty-printed JSON on separate lines
  const hasComplexValues = Object.values(obj).some(v => 
    typeof v === 'object' && v !== null && !Array.isArray(v)
  )

  if (hasComplexValues) {
    const safeObj = Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          // CRITICAL: Check if value is a SharedValue before processing
          // Avoid accessing .value during render (causes Reanimated warnings)
          if (typeof v === 'object' && v !== null && 'value' in v && !Array.isArray(v)) {
            return [k, 'SharedValue']
          }
          
          const safeValue = redact(v)
          if (k === 'duration' || k === 'dur' || k === 'audioCurrentTime' || k === 'audioDuration' || k === 'currentTime') {
            return [k, humanSeconds(safeValue as number)]
          }
          return [k, safeValue]
        })
    )
    
    const jsonStr = JSON.stringify(safeObj, safeStringifyReplacer, 2)
    return '\n' + colorizeJson(jsonStr)
  }

  // For simple objects, keep inline format
  const pairs = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      // CRITICAL: Check if value is a SharedValue before processing
      // Avoid accessing .value during render (causes Reanimated warnings)
      if (typeof v === 'object' && v !== null && 'value' in v && !Array.isArray(v)) {
        return `${k}=SharedValue`
      }
      
      const safeValue = redact(v)
      if (k === 'duration' || k === 'dur' || k === 'audioCurrentTime' || k === 'audioDuration' || k === 'currentTime') {
        return `${k}=${humanSeconds(safeValue as number)}`
      }
      return `${k}=${truncate(safeValue)}`
    })

  return ` — ${pairs.join(' ')}`
}

export function formatLine(
  level: LogLevel,
  scope: string,
  message: string,
  context?: Record<string, unknown>
): string {
  // Use compact time-only format in dev mode, full ISO in production
  const now = new Date()
  const ts = isDev ? now.toISOString().split('T')[1] : now.toISOString()
  const icon = LEVEL_ICON[level]
  const ctx = formatContext(context)
  
  if (isDev) {
    // Add colors in development
    const coloredTimestamp = `${COLORS.dim}${ts}${COLORS.reset}`
    const coloredScope = `${COLORS.cyan}[${scope}]${COLORS.reset}`
    return `${coloredTimestamp} ${icon} ${coloredScope} ${message}${ctx}`
  }
  
  return `${ts} [${icon}] [${scope}] ${message}${ctx}`
}

// Helper function to log with empty line after and proper level prefixes
function logWithSpacing(formatted: string, level: LogLevel) {
  // Use the correct console method based on level
  switch (level) {
    case 'trace':
      console.debug(formatted)
      break
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(' '+formatted)
      break
    case 'warn':
      console.warn(' '+formatted)
      break
    case 'error':
      console.error(formatted)
      break
    case 'fatal':
      console.error(formatted)
      break
    default:
      console.log(formatted)
  }
}

export type ConsoleRecord = {
  level: LogLevel
  message: string
  args: unknown[]
  timestamp: string
}

export type NetworkRecord = {
  method: string
  url: string
  status?: number
  ok?: boolean
  requestBody?: unknown
  responseBody?: unknown
  error?: unknown
  timestamp: string
  durationMs?: number
}

// Safe development environment detection
let isDev = false
try {
  isDev =
    (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') ||
    (typeof (globalThis as any).__DEV__ !== 'undefined' && !!(globalThis as any).__DEV__)
} catch {
  isDev = false
}

const MAX_BUFFER = 200
const consoleBuffer: ConsoleRecord[] = []
const networkBuffer: NetworkRecord[] = []

// Error buffer for recent errors
const MAX_ERROR_BUFFER = 50
const errorBuffer: Array<{
  timestamp: string
  level: LogLevel
  scope: string
  message: string
  context?: Record<string, unknown>
  stack?: string
}> = []

function pushConsole(record: ConsoleRecord) {
  consoleBuffer.push(record)
  if (consoleBuffer.length > MAX_BUFFER) consoleBuffer.shift()
}

function pushNetwork(record: NetworkRecord) {
  networkBuffer.push(record)
  if (networkBuffer.length > MAX_BUFFER) networkBuffer.shift()
}

function pushError(
  level: LogLevel,
  scope: string,
  message: string,
  context?: Record<string, unknown>,
  stack?: string
) {
  errorBuffer.push({
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    context,
    stack,
  })
  if (errorBuffer.length > MAX_ERROR_BUFFER) errorBuffer.shift()
}


export const log: LoggerLike = {
  trace(scope: string, message: string, context?: Record<string, unknown>) {
    const formatted = formatLine('trace', scope, message, context)
    if (isDev) {
      // biome-ignore lint/suspicious/noConsole: centralized logging utility
      logWithSpacing(formatted, 'trace')
    }
    pushConsole({
      level: 'trace',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })
  },
  debug(scope: string, message: string, context?: Record<string, unknown>) {
    const formatted = formatLine('debug', scope, message, context)
    if (isDev) {
      // biome-ignore lint/suspicious/noConsole: centralized logging utility
      logWithSpacing(formatted, 'debug')
    }
    pushConsole({
      level: 'debug',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })
  },
  info(scope: string, message: string, context?: Record<string, unknown>) {
    // Gate info logs: only in dev, or if explicitly allowed in production
    if (!isDev && !isProductionInfoAllowed(scope, message)) {
      return
    }

    const formatted = formatLine('info', scope, message, context)
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    logWithSpacing(formatted, 'info')
    pushConsole({
      level: 'info',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })
  },
  warn(scope: string, message: string, context?: Record<string, unknown>) {
    const formatted = formatLine('warn', scope, message, context)
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    logWithSpacing(formatted, 'warn')
    pushConsole({
      level: 'warn',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })

    // Send to Sentry in production (sampling handled in Sentry beforeSend hook)
    if (!isDev && Sentry) {
      Sentry.captureMessage(`${scope}: ${message}`, {
        level: 'warning',
        tags: {
          scope,
          issue_type: extractIssueType(message),
        },
        extra: context,
      })
    }
  },
  error(scope: string, message: string, context?: Record<string, unknown>) {
    const formatted = formatLine('error', scope, message, context)
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    logWithSpacing(formatted, 'error')

    // Extract stack trace if available in context
    const stack = context?.error instanceof Error ? context.error.stack :
                 (context?.stack as string) ||
                 undefined

    pushError('error', scope, message, context, stack)
    pushConsole({
      level: 'error',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })
  },
  fatal(scope: string, message: string, context?: Record<string, unknown>) {
    const formatted = formatLine('fatal', scope, message, context)
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    logWithSpacing(formatted, 'fatal')

    // Extract stack trace if available in context
    const stack = context?.error instanceof Error ? context.error.stack :
                 (context?.stack as string) ||
                 undefined

    pushError('fatal', scope, message, context, stack)
    pushConsole({
      level: 'fatal',
      message: `${scope}: ${message}`,
      args: [context],
      timestamp: new Date().toISOString()
    })
  },
}

export function getConsoleLogs(): ConsoleRecord[] {
  return [...consoleBuffer]
}

export function getConsoleErrors(): ConsoleRecord[] {
  return consoleBuffer.filter((r) => r.level === 'error' || r.level === 'warn' || r.level === 'fatal')
}

export function getNetworkLogs(): NetworkRecord[] {
  return [...networkBuffer]
}

export function getNetworkErrors(): NetworkRecord[] {
  return networkBuffer.filter((r) => !!r.error || (typeof r.status === 'number' && r.status >= 400))
}

export function getRecentErrors() {
  return [...errorBuffer]
}

export function clearRecentErrors() {
  errorBuffer.length = 0
}

// Network logging state
let networkLoggingEnabled = false

/**
 * Enable/disable network logging for HTTP requests.
 * When enabled, logs concise one-line summaries of all fetch requests.
 * Returns a cleanup function to restore the original implementation.
 */
export function enableNetworkLogging(enabled = true): () => void {
  networkLoggingEnabled = enabled

  if (!enabled) {
    return () => {}
  }

  try {
    const globalObj: any = (globalThis as any) || (global as any) || {}
    const originalFetch: typeof fetch | undefined = globalObj.fetch
    if (!originalFetch) return () => {}

    const patchedFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = Date.now()
      const method = (
        init?.method ||
        (typeof input === 'string' ? 'GET' : input instanceof Request ? input.method : 'GET')
      ).toUpperCase()
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url

      try {
        const res = await originalFetch(input as any, init as any)
        const durationMs = Date.now() - start

        // Log concise one-line summary
        if (networkLoggingEnabled) {
          const size = res.headers.get('content-length')
          const summary = `${method} ${url} — ${res.status} ${res.statusText} ${humanMs(durationMs)}${size ? ` ${size}B` : ''}`
          log.info('HTTP', summary)
        }

        // Store detailed info in buffer for debugging
        pushNetwork({
          method,
          url,
          status: res.status,
          ok: res.ok,
          timestamp: new Date().toISOString(),
          durationMs,
        })

        return res
      } catch (error) {
        const durationMs = Date.now() - start

        // Log concise error summary
        if (networkLoggingEnabled) {
          const summary = `${method} ${url} — FAILED ${humanMs(durationMs)}`
          log.error('HTTP', summary, { error })
        }

        pushNetwork({
          method,
          url,
          error,
          timestamp: new Date().toISOString(),
          durationMs,
        })
        throw error
      }
    }

    globalObj.fetch = patchedFetch
    return () => {
      try {
        globalObj.fetch = originalFetch
      } catch {}
    }
  } catch {
    return () => {}
  }
}

export function disableNetworkLogging(): void {
  networkLoggingEnabled = false
}

export function isNetworkLoggingEnabled(): boolean {
  return networkLoggingEnabled
}

// ============================================================================
// Change-tracking logger
// ============================================================================

type PrimitiveValue = string | number | boolean | null | undefined

interface LogOnChangeOptions<T> {
  /** Extract comparable state signature from full state */
  selector?: (state: T) => Record<string, PrimitiveValue>
  /** Custom comparator operating on signatures (default: shallow equal) */
  comparator?: (prev: Record<string, PrimitiveValue>, next: Record<string, PrimitiveValue>) => boolean
  /** Log initial state on first call */
  initialLog?: boolean
  /** Default log level for changes */
  level?: LogLevel
  /** Additional context to include in every log */
  context?: Record<string, unknown>
}

// Cache for tracking previous values by key
const changeCache = new Map<string, any>()

/**
 * Shallow equality check for objects with primitive values
 */
function shallowEqual(
  objA: Record<string, PrimitiveValue>,
  objB: Record<string, PrimitiveValue>
): boolean {
  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (objA[key] !== objB[key]) return false
  }

  return true
}

/**
 * Format a diff showing what changed between two states
 */
function formatDiff(
  prev: Record<string, PrimitiveValue>,
  next: Record<string, PrimitiveValue>
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  
  // Use Array to avoid Set iteration issues with older TS targets
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  const allKeys = Array.from(new Set([...prevKeys, ...nextKeys]))
  
  for (const key of allKeys) {
    if (prev[key] !== next[key]) {
      diff[key] = { prev: prev[key], next: next[key] }
    }
  }
  
  return diff
}

/**
 * Default selector - identity function for objects with primitives
 */
function defaultSelector<T>(state: T): Record<string, PrimitiveValue> {
  if (typeof state !== 'object' || state === null) {
    return { value: state as any }
  }
  return state as Record<string, PrimitiveValue>
}

/**
 * Log state only when it changes. Caches previous state by key.
 * 
 * @param key - Unique identifier for this state (e.g., "useVideoAudioSync:video-123")
 * @param nextState - Current state to compare
 * @param scope - Logger scope (e.g., "useVideoAudioSync")
 * @param message - Log message
 * @param options - Configuration options
 * 
 * @example
 * ```ts
 * // Simple usage with primitives
 * logOnChange('myCounter', count, 'Counter', 'Count changed')
 * 
 * // With selector for complex objects
 * logOnChange(
 *   'videoSync',
 *   fullState,
 *   'useVideoAudioSync',
 *   'Sync state changed',
 *   {
 *     selector: (s) => ({
 *       isVideoPlaying: s.isVideoPlaying,
 *       isAudioActive: s.isAudioActive,
 *     }),
 *     level: 'debug'
 *   }
 * )
 * ```
 */
export function logOnChange<T>(
  key: string,
  nextState: T,
  scope: string,
  message: string,
  options: LogOnChangeOptions<T> = {}
): void {
  const {
    selector = defaultSelector,
    comparator,
    initialLog = false,
    level = 'debug',
    context = {},
  } = options

  const nextSignature = selector(nextState)
  const cacheKey = `${scope}:${key}`
  const prevSignature = changeCache.get(cacheKey)

  // First call - initialize cache
  if (prevSignature === undefined) {
    changeCache.set(cacheKey, nextSignature)
    
    if (initialLog) {
      log[level](scope, `${message} (initial)`, {
        ...nextSignature,
        ...context,
      })
    }
    return
  }

  // Compare states
  const hasChanged = comparator
    ? !comparator(prevSignature, nextSignature)
    : !shallowEqual(prevSignature, nextSignature)

  if (!hasChanged) {
    return // No change, skip logging
  }

  // State changed - log diff and update cache
  const diff = formatDiff(prevSignature, nextSignature)
  changeCache.set(cacheKey, nextSignature)

  log[level](scope, message, {
    ...diff,
    ...context,
  })
}

/**
 * Clear cached state for a specific key or all keys
 */
export function clearChangeCache(key?: string): void {
  if (key) {
    changeCache.delete(key)
  } else {
    changeCache.clear()
  }
}

/**
 * Add breadcrumb for Sentry context tracking
 * Records user actions and events leading up to issues
 * 
 * @example
 * logBreadcrumb('user-action', 'User tapped play button', { videoId: '123' })
 * logBreadcrumb('navigation', 'Navigated to video analysis', { route: '/analysis' })
 */
export function logBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (Sentry) {
    Sentry.addBreadcrumb({
      category,
      message,
      level: 'info',
      data,
      timestamp: Date.now() / 1000, // Unix timestamp in seconds
    })
  }
}
