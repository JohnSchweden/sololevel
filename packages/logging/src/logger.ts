/**
 * Cross-platform logger (web + Expo Go)
 * Structured output, dev-gated debug, consistent API
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerLike {
  debug: (scope: string, message: string, context?: Record<string, unknown>) => void
  info: (scope: string, message: string, context?: Record<string, unknown>) => void
  warn: (scope: string, message: string, context?: Record<string, unknown>) => void
  error: (scope: string, message: string, context?: Record<string, unknown>) => void
}

const LEVEL_ICON: Record<LogLevel, string> = {
  // debug: '🐛 DBG',
  // info: 'ℹ INFO', 
  // warn: '⚠️ WARN',
  // error: '⛔ ERR',
  debug: '🐛',
  info: 'ℹ️ ️', 
  warn: '⚠️',
  error: '⛔',
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
  if (ms == null) return undefined
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function truncate(value: unknown, max = 120): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value)
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
          const safeValue = redact(v)
          if (k === 'duration' || k === 'dur') return [k, humanMs(safeValue as number)]
          return [k, safeValue]
        })
    )
    
    const jsonStr = JSON.stringify(safeObj, null, 2)
    return '\n' + colorizeJson(jsonStr)
  }

  // For simple objects, keep inline format
  const pairs = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const safeValue = redact(v)
      if (k === 'duration' || k === 'dur') return `${k}=${humanMs(safeValue as number)}`
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
    return `${coloredTimestamp} [${icon}] ${coloredScope} ${message}${ctx}`
  }
  
  return `${ts} [${icon}] [${scope}] ${message}${ctx}`
}

// Helper function to log with empty line after and proper level prefixes
function logWithSpacing(formatted: string, level: LogLevel) {
  // Use the correct console method based on level
  switch (level) {
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
    default:
      console.log(formatted)
  }
  console.log('') // Empty line
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
    (typeof __DEV__ !== 'undefined' && !!__DEV__) ||
    (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production')
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


export const logger: LoggerLike = {
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
}

export const log = logger

export function getConsoleLogs(): ConsoleRecord[] {
  return [...consoleBuffer]
}

export function getConsoleErrors(): ConsoleRecord[] {
  return consoleBuffer.filter((r) => r.level === 'error' || r.level === 'warn')
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
