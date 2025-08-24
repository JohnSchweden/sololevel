// Re-export everything from config
export * from './config'
export { default as i18n } from './config'

// Re-export hooks and utilities
export { useTranslation, Trans } from 'react-i18next'

// Platform-specific initialization
export * from './init'
