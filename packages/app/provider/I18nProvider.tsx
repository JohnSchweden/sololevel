import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n, initializeI18n } from '../i18n'

export interface I18nProviderProps {
  children: ReactNode
  locale?: string
}

export function I18nProvider({ children, locale }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(i18n.isInitialized)

  useEffect(() => {
    const initialize = async () => {
      if (!i18n.isInitialized) {
        await initializeI18n(locale)
        setIsInitialized(true)
      } else if (locale && i18n.language !== locale) {
        await i18n.changeLanguage(locale)
      }
    }

    initialize()
  }, [locale])

  // Don't render children until i18n is initialized
  if (!isInitialized) {
    return null
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
