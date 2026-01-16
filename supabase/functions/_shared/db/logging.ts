/**
 * Database-backed logging for edge functions
 * Persists logs even when functions timeout or run in background
 */

export interface LogContext {
  jobId?: number
  analysisId?: string
  feedbackId?: number
}

/**
 * Write log to database (fire-and-forget for performance)
 * Uses RPC function to bypass RLS policies
 * Errors are silently ignored to prevent logging failures from breaking the app
 */
export function writeLogToDatabase(
  supabase: any,
  functionName: string,
  module: string | undefined,
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: any,
  context?: LogContext
): void {
  // Fire-and-forget: don't await, don't throw
  // This ensures logging never blocks execution
  // Use RPC function to bypass RLS (SECURITY DEFINER)
  supabase
    .rpc('insert_edge_function_log', {
      p_function_name: functionName,
      p_module: module || null,
      p_level: level,
      p_message: message,
      p_data: data ? (typeof data === 'object' ? data : { value: data }) : null,
      p_job_id: context?.jobId || null,
      p_analysis_id: context?.analysisId || null,
      p_feedback_id: context?.feedbackId || null,
    })
    .then(() => {
      // Success - no action needed
    })
    .catch((error: unknown) => {
      // Log errors to console so we can debug why database logging fails
      // This won't break the app but helps identify RLS/permission issues
      console.error('[Database Logger] Failed to write log:', {
        error: error instanceof Error ? error.message : String(error),
        functionName,
        module,
        level,
        message: message.substring(0, 100), // Truncate long messages
      })
    })
}

/**
 * Database logger interface with child logger support
 */
export interface DatabaseLogger {
  info: (msg: string, data?: any) => void
  error: (msg: string, error?: any) => void
  warn: (msg: string, data?: any) => void
  debug: (msg: string, data?: any) => void
  child: (module: string) => DatabaseLogger
}

/**
 * Create a logger that writes to both console and database
 * Supports child loggers for module-specific logging
 */
export function createDatabaseLogger(
  functionName: string,
  module: string,
  supabase: any,
  context?: LogContext
): DatabaseLogger {
  const createLoggerMethods = (mod: string): DatabaseLogger => ({
    info(message: string, data?: any) {
      console.log(`[${mod}] ${message}`, data || '')
      writeLogToDatabase(supabase, functionName, mod, 'info', message, data, context)
    },
    error(message: string, error?: any) {
      const errorData = error?.message || error
      console.error(`[${mod}] ${message}`, errorData || '')
      writeLogToDatabase(supabase, functionName, mod, 'error', message, errorData, context)
    },
    warn(message: string, data?: any) {
      console.warn(`[${mod}] ${message}`, data || '')
      writeLogToDatabase(supabase, functionName, mod, 'warn', message, data, context)
    },
    debug(message: string, data?: any) {
      console.debug(`[${mod}] ${message}`, data || '')
      writeLogToDatabase(supabase, functionName, mod, 'debug', message, data, context)
    },
    child(childModule: string) {
      return createLoggerMethods(childModule)
    },
  })

  return createLoggerMethods(module)
}
