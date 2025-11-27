import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import deCommon from '../locales/de/common.json'
// Import locale files
import enCommon from '../locales/en/common.json'
import frCommon from '../locales/fr/common.json'

export const defaultNS = 'common'
export const fallbackLng = 'en'
export const supportedLngs = ['en', 'de', 'fr'] as const

export type SupportedLanguage = (typeof supportedLngs)[number]

// Define resources with proper typing
const resources = {
  en: {
    common: enCommon.common, // Use the 'common' key from the JSON file
  },
  de: {
    common: deCommon.common,
  },
  fr: {
    common: frCommon.common,
  },
} as const

export const i18nConfig = {
  resources,
  lng: fallbackLng,
  fallbackLng,
  defaultNS: 'common', // Explicitly set to 'common' instead of variable
  ns: ['common'], // Explicitly set namespaces
  supportedLngs,
  interpolation: {
    escapeValue: false, // React already does escaping
  },
  react: {
    useSuspense: false, // We'll handle loading states manually
  },
  // Development settings - explicitly check for development
  debug: process.env.NODE_ENV === 'development',
  saveMissing: process.env.NODE_ENV === 'development',
  keySeparator: '.',
  nsSeparator: ':',
}

// Initialize i18n synchronously at module load
// Resources are already imported as JSON (static imports), so initialization is fast
// This ensures i18n is always ready before any component tries to use it
// I18nProvider will handle locale detection/change asynchronously if needed
export const configWithDebugOff = {
  ...i18nConfig,
  debug: false,
}

// Initialize i18n synchronously - resources are already in memory from static imports
// This prevents uninitialized state if I18nProvider fails to mount or errors
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init(configWithDebugOff)
}

export default i18n

// Type augmentation for react-i18next
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['en']
  }
}
