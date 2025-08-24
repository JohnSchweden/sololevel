import i18n, { type SupportedLanguage, supportedLngs, fallbackLng } from './config'

// Web-specific device locale detection
export const getDeviceLocale = (): SupportedLanguage => {
  if (typeof window === 'undefined') {
    return fallbackLng
  }

  // Get browser locale
  const browserLocale = navigator.language || navigator.languages?.[0] || fallbackLng

  // Extract language code (e.g., 'en-US' -> 'en')
  const languageCode = browserLocale.split('-')[0]

  // Check if the browser locale is supported
  const supportedLocale = supportedLngs.find((lang) => languageCode === lang) || fallbackLng

  return supportedLocale
}

// Initialize i18next with device locale for web
export const initializeI18n = async (locale?: string): Promise<void> => {
  const deviceLocale = locale || getDeviceLocale()

  // Ensure the locale is supported
  const supportedLocale = supportedLngs.includes(deviceLocale as SupportedLanguage)
    ? (deviceLocale as SupportedLanguage)
    : fallbackLng

  if (i18n.language !== supportedLocale) {
    await i18n.changeLanguage(supportedLocale)
  }
}

// Change language helper
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language)

  // Store preference in localStorage for web
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', language)
  }
}

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || fallbackLng
}

// Check if language is supported
export const isLanguageSupported = (language: string): language is SupportedLanguage => {
  return supportedLngs.includes(language as SupportedLanguage)
}

// Get stored language preference from localStorage
export const getStoredLanguagePreference = (): SupportedLanguage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem('preferred-language')
  return stored && isLanguageSupported(stored) ? stored : null
}
