import i18n, { type SupportedLanguage, supportedLngs, fallbackLng } from './config'

// Get device locale (platform-specific implementations will override this)
export const getDeviceLocale = (): SupportedLanguage => {
  // Default fallback implementation
  return fallbackLng
}

// Initialize i18next with device locale
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
}

// Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || fallbackLng
}

// Check if language is supported
export const isLanguageSupported = (language: string): language is SupportedLanguage => {
  return supportedLngs.includes(language as SupportedLanguage)
}
