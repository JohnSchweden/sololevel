// Simple toast controller implementation for MVP
// This replaces the @tamagui/toast dependency until test issues are resolved

interface ToastController {
  show: (title: string, options?: { message?: string; type?: 'success' | 'error' | 'info' }) => void
}

export function useToastController(): ToastController {
  return {
    show: (title: string, options?: { message?: string; type?: 'success' | 'error' | 'info' }) => {
      // For now, just log to console - can be enhanced with actual toast implementation later
      console.log(
        `[Toast] ${options?.type?.toUpperCase() || 'INFO'}: ${title}${options?.message ? ` - ${options.message}` : ''}`
      )
    },
  }
}
