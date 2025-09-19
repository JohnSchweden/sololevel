/**
 * Simple logger utility for prompts system
 * Works across different environments (Node.js, Deno, browser)
 */

// Logger interface
export interface LoggerLike {
  debug: (message: string, data?: any) => void
  info: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
}

// Simple logger implementation
const createLogger = (): LoggerLike => {
  const formatMessage = (level: string, message: string, data?: any): string => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      level: level.toUpperCase(),
      message,
      data,
      timestamp,
      module: 'prompts',
    }
    return JSON.stringify(logEntry)
  }

  return {
    debug: (message: string, data?: any) => {
      // Only log in development or when explicitly enabled
      if (typeof console !== 'undefined') {
        console.debug(formatMessage('debug', message, data))
      }
    },
    info: (message: string, data?: any) => {
      if (typeof console !== 'undefined') {
        console.info(formatMessage('info', message, data))
      }
    },
    warn: (message: string, data?: any) => {
      if (typeof console !== 'undefined') {
        console.warn(formatMessage('warn', message, data))
      }
    },
    error: (message: string, data?: any) => {
      if (typeof console !== 'undefined') {
        console.error(formatMessage('error', message, data))
      }
    },
  }
}

// Export the logger instance
export const logger = createLogger()
