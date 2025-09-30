// Simple toast controller implementation for MVP
// This replaces the @tamagui/toast dependency until test issues are resolved
import { log } from '@my/logging'

interface ToastController {
  show: (title: string, options?: { message?: string; type?: 'success' | 'error' | 'info' }) => void
}

export function useToastController(): ToastController {
  return {
    show: (title: string, options?: { message?: string; type?: 'success' | 'error' | 'info' }) => {
      // For now, just log to console - can be enhanced with actual toast implementation later
      const level =
        options?.type === 'error' ? 'error' : options?.type === 'success' ? 'info' : 'info'
      const emoji = options?.type === 'error' ? '❌' : options?.type === 'success' ? '✅' : 'ℹ️'

      log[level](
        'ToastController',
        `${emoji} ${title}${options?.message ? ` - ${options.message}` : ''}`
      )
    },
  }
}
