/**
 * Deno-compatible logger for Supabase Edge Functions
 * Structured logging optimized for serverless environment
 */

// Deno environment detection
const _env = ((globalThis as any).Deno?.env?.get('NODE_ENV') || '').toLowerCase()
const isDevelopment = _env === 'development' || _env === 'dev' || _env === 'local' || _env === 'test'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerLike {
  debug: (message: string, data?: any) => void
  info: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, error?: any) => void
}

export type ConsoleRecord = {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  module?: string
}

export type NetworkRecord = {
  method: string
  url: string
  status?: number
  ok?: boolean
  requestBody?: any
  responseBody?: any
  error?: any
  timestamp: string
  durationMs?: number
}

// Buffer for console logs (limited size for memory efficiency)
const MAX_BUFFER = 100
const consoleBuffer: ConsoleRecord[] = []
const networkBuffer: NetworkRecord[] = []

function pushConsole(record: ConsoleRecord) {
  consoleBuffer.push(record)
  if (consoleBuffer.length > MAX_BUFFER) consoleBuffer.shift()
}

function pushNetwork(record: NetworkRecord) {
  networkBuffer.push(record)
  if (networkBuffer.length > MAX_BUFFER) networkBuffer.shift()
}

function formatMessage(
  _level: LogLevel,
  message: string,
  data?: any,
  module?: string
): [string] | [string, any] {
  const modulePrefix = module ? `[${module}] ` : ''

  if (data !== undefined) {
    return [`${modulePrefix}${message}`, data]
  }
  return [`${modulePrefix}${message}`]
}

/**
 * Create a logger instance with a specific module name
 */
export function createLogger(moduleName: string): LoggerLike {
  return {
    debug(message: string, data?: any) {
      if (isDevelopment) {
        console.debug(...formatMessage('debug', message, data, moduleName))
      }
      pushConsole({
        level: 'debug',
        message,
        data,
        timestamp: new Date().toISOString(),
        module: moduleName,
      })
    },

    info(message: string, data?: any) {
      // Only log to console in development to avoid duplicate logs in Supabase
      if (isDevelopment) {
        console.log(...formatMessage('info', message, data, moduleName))
      }
      pushConsole({
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString(),
        module: moduleName,
      })
    },

    warn(message: string, data?: any) {
      console.warn(...formatMessage('warn', message, data, moduleName))
      pushConsole({
        level: 'warn',
        message,
        data,
        timestamp: new Date().toISOString(),
        module: moduleName,
      })
    },

    error(message: string, error?: any) {
      const errorData = error?.message || error
      console.error(...formatMessage('error', message, errorData, moduleName))
      pushConsole({
        level: 'error',
        message,
        data: errorData,
        timestamp: new Date().toISOString(),
        module: moduleName,
      })
    },
  }
}

export const logger = createLogger('edge-function')

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

/**
 * Enable lightweight network logging by patching global fetch.
 * Returns a cleanup function to restore the original implementation.
 */
export function enableNetworkLogging(): () => void {
  try {
    const globalObj = globalThis as any
    const originalFetch: typeof fetch | undefined = globalObj.fetch
    if (!originalFetch) return () => {}

    const patchedFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const start = Date.now()
      const method = (init?.method || (typeof input === 'string' ? 'GET' : 'GET')).toUpperCase()
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url
      let requestBody: any
      try {
        requestBody = init?.body
      } catch {
        // Ignore errors when accessing request body
      }

      try {
        const res = await originalFetch(input as any, init as any)
        const durationMs = Date.now() - start
        const clone = res.clone()
        let responseBody: any = undefined
        try {
          // Avoid large binary bodies; best-effort text
          responseBody = await clone.text()
        } catch {
          // Ignore errors when reading response body
        }
        pushNetwork({
          method,
          url,
          status: res.status,
          ok: res.ok,
          requestBody,
          responseBody,
          timestamp: new Date().toISOString(),
          durationMs,
        })
        return res
      } catch (error) {
        const durationMs = Date.now() - start
        pushNetwork({
          method,
          url,
          error,
          requestBody,
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
      } catch {
        // Ignore errors when restoring original fetch
      }
    }
  } catch {
    return () => {}
  }
}
