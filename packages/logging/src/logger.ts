/**
 * Cross-platform logger (web + Expo Go)
 * Structured output, dev-gated debug, consistent API
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogMethod = (message: string, ...args: unknown[]) => void

export interface LoggerLike {
  debug: LogMethod
  info: LogMethod
  warn: LogMethod
  error: LogMethod
}

export type ConsoleRecord = {
  level: 'debug' | 'info' | 'warn' | 'error'
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

function pushConsole(record: ConsoleRecord) {
  consoleBuffer.push(record)
  if (consoleBuffer.length > MAX_BUFFER) consoleBuffer.shift()
}

function pushNetwork(record: NetworkRecord) {
  networkBuffer.push(record)
  if (networkBuffer.length > MAX_BUFFER) networkBuffer.shift()
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] ${level.toUpperCase()}:`
  return args.length > 0 ? [prefix, message, ...args] : [prefix, message]
}

export const logger: LoggerLike = {
  debug(message: string, ...args: unknown[]) {
    if (isDev) {
      // biome-ignore lint/suspicious/noConsole: centralized logging utility
      console.debug(...formatMessage('debug', message, ...args))
    }
    pushConsole({ level: 'debug', message, args, timestamp: new Date().toISOString() })
  },
  info(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.info(...formatMessage('info', message, ...args))
    pushConsole({ level: 'info', message, args, timestamp: new Date().toISOString() })
  },
  warn(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.warn(...formatMessage('warn', message, ...args))
    pushConsole({ level: 'warn', message, args, timestamp: new Date().toISOString() })
  },
  error(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.error(...formatMessage('error', message, ...args))
    pushConsole({ level: 'error', message, args, timestamp: new Date().toISOString() })
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

/**
 * Enable lightweight network logging by patching global fetch.
 * Returns a cleanup function to restore the original implementation.
 */
export function enableNetworkLogging(): () => void {
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
      let requestBody: unknown
      try {
        requestBody = init?.body
      } catch {}

      try {
        const res = await originalFetch(input as any, init as any)
        const durationMs = Date.now() - start
        const clone = res.clone()
        let responseBody: unknown = undefined
        try {
          // Avoid large binary bodies; best-effort text
          responseBody = await clone.text()
        } catch {}
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
      } catch {}
    }
  } catch {
    return () => {}
  }
}
