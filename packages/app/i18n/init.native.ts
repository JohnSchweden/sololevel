import * as Localization from 'expo-localization'
import i18n, { type SupportedLanguage, supportedLngs, fallbackLng } from './config'

// Native-specific device locale detection
export const getDeviceLocale = (): SupportedLanguage => {
  // Get device locale from Expo Localization
  const deviceLocale = Localization.getLocales()[0]?.languageCode || fallbackLng

  // Check if the device locale is supported
  const supportedLocale = supportedLngs.find((lang) => deviceLocale.startsWith(lang)) || fallbackLng

  return supportedLocale
}

// Initialize i18next with device locale for native
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
