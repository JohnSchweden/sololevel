import { log } from '@my/logging'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n, initializeI18n } from '../i18n'

export interface I18nProviderProps {
  children: ReactNode
  locale?: string
}

export function I18nProvider({ children, locale }: I18nProviderProps) {
  useEffect(() => {
    // i18n is already initialized synchronously at module load
    // Only handle locale changes here (can be async for device locale detection)
    const updateLocale = async () => {
      if (locale && i18n.language !== locale) {
        await i18n.changeLanguage(locale)
      } else if (!locale) {
        // If no locale prop provided, detect device locale asynchronously
        await initializeI18n()
      }
    }

    // Defer locale detection to avoid blocking first render
    // i18n is already initialized, so translations work immediately with fallback
    const timer = setTimeout(() => {
      updateLocale().catch((error) => {
        log.error('I18nProvider', 'Failed to update locale', {
          error,
          locale,
          currentLanguage: i18n.language,
        })
        // Gracefully handle locale change failures - app continues with current/fallback locale
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [locale])

  // i18n is guaranteed to be initialized at this point (module-level init)
  // Children can use translations immediately, locale will update asynchronously if needed
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
