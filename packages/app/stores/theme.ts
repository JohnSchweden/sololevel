import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeState {
  mode: ThemeMode
  isDark: boolean
}

export interface ThemeActions {
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  setIsDark: (isDark: boolean) => void
}

export type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  // State
  mode: 'light' as ThemeMode,
  isDark: false,

  // Actions
  setMode: (mode) => {
    set({ mode })

    // Update isDark based on mode
    if (mode === 'system') {
      // Check system preference
      if (typeof window !== 'undefined') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        set({ isDark })
      }
    } else {
      set({ isDark: mode === 'dark' })
    }
  },

  toggleMode: () => {
    const { mode } = get()
    const newMode = mode === 'dark' ? 'light' : 'dark'
    set({ mode: newMode, isDark: newMode === 'dark' })
  },

  setIsDark: (isDark) => {
    set({ isDark })
  },
}))
