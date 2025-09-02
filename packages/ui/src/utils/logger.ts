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

// Safe development environment detection
let isDev = false
try {
  isDev =
    (typeof __DEV__ !== 'undefined' && !!__DEV__) ||
    (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production')
} catch {
  isDev = false
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
  },
  info(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.info(...formatMessage('info', message, ...args))
  },
  warn(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.warn(...formatMessage('warn', message, ...args))
  },
  error(message: string, ...args: unknown[]) {
    // biome-ignore lint/suspicious/noConsole: centralized logging utility
    console.error(...formatMessage('error', message, ...args))
  },
}

export const log = logger
